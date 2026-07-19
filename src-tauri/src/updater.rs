//! Automatic-update engine for the PrimeBuild Official Store desktop shell (Tauri 2).
//!
//! The updater is driven **entirely from Rust** via `UpdaterExt`. The technical
//! update panel (a separate webview window `"updater"`, `updater.html`) only
//! *invokes* these commands and *listens* to the two events below — so the web
//! layer never receives filesystem/shell/http/updater permissions. This keeps
//! the deny-by-default capability posture intact and leaves the PrimeBuild
//! Official Store web application completely untouched.
//!
//! Runtime policy (endpoint, channel, cadence, mandatory rules) comes from the
//! bundled `dist.config.json` (see `dist.rs`), so distribution behaviour can be
//! changed without rebuilding the binary.
//!
//! Events emitted (payloads are plain JSON):
//!   * `core://update-status`   → { state, message, version?, notes?, date?, error?, mandatory?, mandatoryReason? }
//!   * `core://update-progress` → { downloaded, total?, percent? }
//!
//! `state` is one of the canonical strings:
//!   CHECKING | UP_TO_DATE | UPDATE_AVAILABLE | DOWNLOADING | READY_TO_INSTALL
//!   | INSTALLING | FAILED | OFFLINE | NOT_CONFIGURED
//!
//! Recovery guarantees: a failed or unsigned update never replaces the working
//! install (the Tauri updater verifies the minisign signature before applying,
//! and only swaps the installation on a successful install), so the app is never
//! left partially updated.

use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_updater::{Updater, UpdaterExt};

use crate::dist::{self, DistConfig};
use crate::logging::Logger;

/// Windows NSIS updates never return from `download_and_install` (the plugin
/// spawns the installer and calls `std::process::exit(0)`), so the relaunch is
/// performed by the installer itself via `/UPDATE`.
const INSTALLER_RELAUNCHES: bool = cfg!(windows);

/// Guards against two concurrent download/install cycles.
static BUSY: AtomicBool = AtomicBool::new(false);

const UPDATE_WINDOW: &str = "updater";

#[derive(Clone, Serialize)]
pub struct VersionInfo {
    /// Semantic version (from Cargo, kept in sync with package.json/tauri.conf).
    pub version: String,
    pub build: String,
    pub commit: String,
    pub build_date: String,
    pub environment: String,
    pub channel: String,
    /// True when a real updater endpoint is configured in this build.
    pub updater_configured: bool,
}

#[derive(Clone, Serialize, Default)]
struct UpdateStatus {
    state: String,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    notes: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    mandatory: Option<bool>,
    #[serde(rename = "mandatoryReason", skip_serializing_if = "Option::is_none")]
    mandatory_reason: Option<String>,
}

#[derive(Clone, Serialize)]
struct UpdateProgress {
    downloaded: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    total: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    percent: Option<u32>,
}

/// Result returned to the panel from an explicit check.
#[derive(Clone, Serialize)]
pub struct CheckResult {
    pub state: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    pub mandatory: bool,
}

/// Emit a status to the panel *and* record it in the shell log, so a failed
/// update is diagnosable after the fact even though the panel is transient.
/// Errors are logged at ERROR, degraded-but-expected states at WARN.
fn emit_status(app: &AppHandle, status: UpdateStatus) {
    let level = match status.state.as_str() {
        "FAILED" => "ERROR",
        "OFFLINE" | "NOT_CONFIGURED" | "NO_RELEASE" => "WARN",
        _ => "INFO",
    };
    let mut line = format!("update[{}] {}", status.state, status.message);
    if let Some(v) = &status.version {
        line.push_str(&format!(" (v{v})"));
    }
    if let Some(e) = &status.error {
        line.push_str(&format!(" — {e}"));
    }
    Logger::for_app(app).log(level, &line);
    let _ = app.emit("core://update-status", status);
}

fn log(app: &AppHandle, level: &str, msg: &str) {
    Logger::for_app(app).log(level, &format!("update {msg}"));
}

fn dev_mode() -> bool {
    cfg!(debug_assertions)
}

/// A placeholder endpoint counts as "not configured" so the panel is honest.
fn endpoint_is_real(endpoint: &str) -> bool {
    !endpoint.trim().is_empty() && !endpoint.contains("OWNER/REPO")
}

/// The endpoint answered, but there is no usable release JSON behind it — a 404
/// (nothing published yet, or the manifest asset is missing from the latest
/// release). That is a publishing state, not a malfunction, so the panel must
/// not shout FAILED at the user over it.
fn is_no_release_published(msg: &str) -> bool {
    let m = msg.to_lowercase();
    m.contains("could not fetch a valid release json")
}

/// Heuristic split so the panel can show an honest OFFLINE vs FAILED state.
fn is_network_error(msg: &str) -> bool {
    let m = msg.to_lowercase();
    [
        "network", "connect", "dns", "timed out", "timeout", "unreachable", "request", "reqwest",
        "resolve", "offline",
    ]
    .iter()
    .any(|k| m.contains(k))
}

/// Build an updater honoring the runtime endpoint from `dist.config.json` when
/// it is real; otherwise fall back to the endpoint compiled into tauri.conf.json.
fn build_updater(app: &AppHandle, cfg: &DistConfig) -> Result<Updater, String> {
    let mut builder = app.updater_builder();
    if endpoint_is_real(&cfg.endpoint) {
        let url = cfg
            .endpoint
            .parse::<url::Url>()
            .map_err(|e| format!("endpoint inválido en dist.config.json: {e}"))?;
        builder = builder.endpoints(vec![url]).map_err(|e| e.to_string())?;
    }
    // Runs immediately before the plugin launches the installer and terminates
    // this process with `std::process::exit(0)` — which bypasses Tauri's
    // ExitRequested handler. Releasing the bundled Node server here is what
    // stops it becoming an orphan and holding the installed files locked
    // against the installer that is about to overwrite them.
    let hook_app = app.clone();
    builder = builder.on_before_exit(move || {
        let killed = crate::shutdown_sidecar(&hook_app);
        log(
            &hook_app,
            "INFO",
            if killed {
                "handing over to installer; local server stopped, process exiting"
            } else {
                "handing over to installer; no local server was running"
            },
        );
    });
    builder.build().map_err(|e| e.to_string())
}

pub fn version_info(app: &AppHandle) -> VersionInfo {
    let cfg = dist::load(app);
    let channel = if cfg.channel.is_empty() { env!("PBC_CHANNEL").to_string() } else { cfg.channel };
    let updater_configured = !dev_mode() && endpoint_is_real(&cfg.endpoint) && app.updater().is_ok();
    VersionInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        build: env!("PBC_BUILD_NUMBER").to_string(),
        commit: env!("PBC_GIT_COMMIT").to_string(),
        build_date: env!("PBC_BUILD_DATE").to_string(),
        environment: if dev_mode() { "development".into() } else { "production".into() },
        channel,
        updater_configured,
    }
}

#[tauri::command]
pub fn get_version_info(app: AppHandle) -> VersionInfo {
    version_info(&app)
}

/// Open (or focus) the separate technical update window. Reuses the window if it
/// already exists. Loads `updater.html` from the bundled frontend assets — this
/// is a standalone panel and never navigates into the Core business app.
#[tauri::command]
pub fn open_update_panel(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(UPDATE_WINDOW) {
        let _ = win.show();
        let _ = win.set_focus();
        return Ok(());
    }
    WebviewWindowBuilder::new(&app, UPDATE_WINDOW, WebviewUrl::App("updater.html".into()))
        .title("PrimeBuild Official Store — Actualizaciones")
        .inner_size(560.0, 660.0)
        .min_inner_size(460.0, 540.0)
        .resizable(true)
        .maximizable(false)
        .center()
        .visible(true)
        .build()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

/// Explicit "check for updates". Emits status events and also returns the
/// outcome so the caller can react synchronously.
#[tauri::command]
pub async fn updater_check(app: AppHandle) -> CheckResult {
    check_impl(&app).await
}

async fn check_impl(app: &AppHandle) -> CheckResult {
    let none = |state: &str, error: Option<String>| CheckResult {
        state: state.into(),
        version: None,
        notes: None,
        date: None,
        error,
        mandatory: false,
    };

    if dev_mode() {
        let msg = "El actualizador solo está activo en la app empaquetada (no en modo dev).".to_string();
        emit_status(
            app,
            UpdateStatus { state: "NOT_CONFIGURED".into(), message: "Actualizador no disponible en modo desarrollo.".into(), error: Some(msg.clone()), ..Default::default() },
        );
        return none("NOT_CONFIGURED", Some(msg));
    }

    let cfg = dist::load(app);
    if !endpoint_is_real(&cfg.endpoint) {
        let msg = "No hay endpoint de actualización configurado (dist.config.json).".to_string();
        emit_status(
            app,
            UpdateStatus { state: "NOT_CONFIGURED".into(), message: msg.clone(), ..Default::default() },
        );
        return none("NOT_CONFIGURED", Some(msg));
    }

    emit_status(app, UpdateStatus { state: "CHECKING".into(), message: "Buscando actualizaciones…".into(), ..Default::default() });

    let updater = match build_updater(app, &cfg) {
        Ok(u) => u,
        Err(msg) => {
            emit_status(app, UpdateStatus { state: "NOT_CONFIGURED".into(), message: "El actualizador no está configurado en esta build.".into(), error: Some(msg.clone()), ..Default::default() });
            return none("NOT_CONFIGURED", Some(msg));
        }
    };

    match updater.check().await {
        Ok(Some(update)) => {
            let current = env!("CARGO_PKG_VERSION");
            let mandatory = cfg.mandatory || dist::version_lt(current, &cfg.min_supported_version);
            let date = update.date.map(|d| d.to_string());
            emit_status(
                app,
                UpdateStatus {
                    state: "UPDATE_AVAILABLE".into(),
                    message: format!("Actualización disponible: v{}", update.version),
                    version: Some(update.version.clone()),
                    notes: update.body.clone(),
                    date: date.clone(),
                    mandatory: Some(mandatory),
                    mandatory_reason: if mandatory && !cfg.mandatory_reason.is_empty() { Some(cfg.mandatory_reason.clone()) } else { None },
                    ..Default::default()
                },
            );
            CheckResult { state: "UPDATE_AVAILABLE".into(), version: Some(update.version.clone()), notes: update.body.clone(), date, error: None, mandatory }
        }
        Ok(None) => {
            emit_status(app, UpdateStatus { state: "UP_TO_DATE".into(), message: "PrimeBuild Official Store está actualizado.".into(), ..Default::default() });
            none("UP_TO_DATE", None)
        }
        Err(e) => {
            let msg = e.to_string();
            let (state, message) = if is_no_release_published(&msg) {
                ("NO_RELEASE", "No hay ninguna versión publicada todavía en el canal de actualizaciones.")
            } else if is_network_error(&msg) {
                ("OFFLINE", "Sin conexión con el servidor de actualizaciones.")
            } else {
                ("FAILED", "No se pudo comprobar actualizaciones.")
            };
            emit_status(
                app,
                UpdateStatus {
                    state: state.into(),
                    message: message.into(),
                    error: Some(msg.clone()),
                    ..Default::default()
                },
            );
            none(state, Some(msg))
        }
    }
}

/// Download and install the pending update, emitting real download progress.
/// The Tauri updater verifies the signature before applying; on any failure the
/// current install is left intact.
#[tauri::command]
pub async fn updater_download_and_install(app: AppHandle) -> Result<(), String> {
    if dev_mode() {
        return Err("Actualizador no disponible en modo desarrollo.".into());
    }
    if BUSY.swap(true, Ordering::SeqCst) {
        log(&app, "WARN", "download requested while one was already in progress — ignored");
        return Err("Ya hay una descarga en curso.".into());
    }
    let result = download_impl(&app).await;
    BUSY.store(false, Ordering::SeqCst);
    result
}

async fn download_impl(app: &AppHandle) -> Result<(), String> {
    let cfg = dist::load(app);
    let updater = build_updater(app, &cfg).map_err(|msg| {
        emit_status(app, UpdateStatus { state: "NOT_CONFIGURED".into(), message: "Actualizador no configurado.".into(), error: Some(msg.clone()), ..Default::default() });
        msg
    })?;

    let update = match updater.check().await {
        Ok(Some(u)) => u,
        Ok(None) => {
            emit_status(app, UpdateStatus { state: "UP_TO_DATE".into(), message: "No hay actualización que instalar.".into(), ..Default::default() });
            return Ok(());
        }
        Err(e) => {
            let msg = e.to_string();
            let state = if is_network_error(&msg) { "OFFLINE" } else { "FAILED" };
            emit_status(app, UpdateStatus { state: state.into(), message: "No se pudo obtener la actualización.".into(), error: Some(msg.clone()), ..Default::default() });
            return Err(msg);
        }
    };

    emit_status(
        app,
        UpdateStatus { state: "DOWNLOADING".into(), message: format!("Descargando v{}…", update.version), version: Some(update.version.clone()), ..Default::default() },
    );

    let progress_app = app.clone();
    let downloaded = Arc::new(AtomicU64::new(0));
    let dl = downloaded.clone();

    let install_result = update
        .download_and_install(
            move |chunk_len, content_len| {
                let total_now = dl.fetch_add(chunk_len as u64, Ordering::SeqCst) + chunk_len as u64;
                let percent = content_len.map(|t| if t > 0 { ((total_now.min(t) * 100) / t) as u32 } else { 0 });
                let _ = progress_app.emit("core://update-progress", UpdateProgress { downloaded: total_now, total: content_len, percent });
            },
            {
                let app = app.clone();
                move || {
                    // Download finished, signature verified. On Windows this is
                    // the LAST status the panel will ever see: the plugin now
                    // launches the installer and exits the process, and the
                    // installer relaunches the app itself. Say so plainly
                    // instead of leaving the user staring at a dead window.
                    let message = if INSTALLER_RELAUNCHES {
                        "Firma verificada. Instalando: la aplicación se cerrará y volverá a abrirse sola."
                    } else {
                        "Firma verificada. Instalando actualización…"
                    };
                    emit_status(&app, UpdateStatus { state: "INSTALLING".into(), message: message.into(), ..Default::default() });
                }
            },
        )
        .await;

    match install_result {
        // Reached on platforms where the installer does not terminate us
        // (i.e. not Windows NSIS); there the user still has to relaunch.
        Ok(_) => {
            emit_status(app, UpdateStatus { state: "READY_TO_INSTALL".into(), message: "Actualización instalada. Reinicia para completar.".into(), ..Default::default() });
            Ok(())
        }
        Err(e) => {
            let msg = e.to_string();
            // Signature/verification failures land here — the old install stays.
            emit_status(
                app,
                UpdateStatus { state: "FAILED".into(), message: "La actualización falló y no se aplicó. Tu versión actual sigue intacta.".into(), error: Some(msg.clone()), ..Default::default() },
            );
            Err(msg)
        }
    }
}

/// Relaunch the app to run the freshly installed version. On Windows the NSIS
/// installer already does this, so this is the manual fallback.
#[tauri::command]
pub fn updater_relaunch(app: AppHandle) {
    log(&app, "INFO", "relaunch requested by user");
    crate::shutdown_sidecar(&app);
    app.restart();
}

/// Background check used at startup and on a periodic timer. When `auto_open` is
/// set and an update is available, surfaces the technical panel so the user can
/// decide. Never blocks the app and never forces anything.
pub fn spawn_background_check(app: &AppHandle, auto_open: bool) {
    if dev_mode() {
        return;
    }
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        let result = check_impl(&app).await;
        if auto_open && result.state == "UPDATE_AVAILABLE" {
            let _ = open_update_panel(app.clone());
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn placeholder_endpoint_is_not_configured() {
        // The OWNER/REPO placeholder is a deliberate sentinel: it must read as
        // "not configured" so the panel stays honest instead of failing later.
        assert!(!endpoint_is_real(
            "https://github.com/OWNER/REPO/releases/latest/download/latest.json"
        ));
        assert!(!endpoint_is_real(""));
        assert!(!endpoint_is_real("   "));
        assert!(endpoint_is_real("http://127.0.0.1:8787/latest.json"));
        assert!(endpoint_is_real(
            "https://github.com/primebuildfit-lab/store/releases/latest/download/latest.json"
        ));
    }

    #[test]
    fn empty_release_channel_is_not_reported_as_a_failure() {
        // Exact message the plugin raises on a 404 from the endpoint. Until the
        // first release is published this is the NORMAL state, so it must not
        // surface as FAILED — and it must not be mistaken for a network fault.
        let msg = "Could not fetch a valid release JSON from the remote";
        assert!(is_no_release_published(msg));
        assert!(!is_network_error(msg));
    }

    #[test]
    fn network_errors_are_reported_as_offline() {
        assert!(is_network_error("error sending request for url"));
        assert!(is_network_error("dns error: failed to lookup address"));
        assert!(is_network_error("operation timed out"));
        // A signature rejection is NOT a connectivity problem and must surface
        // as FAILED, otherwise a tampered update looks like a flaky network.
        assert!(!is_network_error("signature verification failed"));
        assert!(!is_network_error("invalid minisign signature"));
    }
}
