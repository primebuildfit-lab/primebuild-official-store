//! PrimeBuild Official Store desktop shell (Tauri 2).
//!
//! Wraps the PrimeBuild Official Store web app in a native Windows window WITHOUT
//! changing its design, routes, data or logic. In production it boots the bundled
//! local server on 127.0.0.1, shows a splash while it starts, then loads it.
//! External links open in the system browser; the main window only ever shows
//! local Official Store content.
//!
//! The Official Store reads the live Shopify storefront over HTTPS at runtime and
//! has no local database, so this shell does not seed or pass any database. It
//! only starts the local Next server and waits for `/api/health`.

mod dist;
mod logging;
mod related;
mod runtime;
mod updater;

use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_window_state::{StateFlags, WindowExt};

use logging::Logger;

/// Domains Core links out to that we treat as trusted (opened in the system
/// browser, logged as INFO). Anything else http/https still opens in the
/// browser but is logged as WARN. Non-web schemes are blocked outright.
const TRUSTED_SUFFIXES: &[&str] = &[
    "shopify.com",
    "myshopify.com",
    "railway.app",
    "railway.com",
    "supabase.co",
    "supabase.com",
    "github.com",
    "githubusercontent.com",
    "primebuildfit.com",
    "vercel.app",
];

#[derive(Clone, Serialize)]
struct BootStatus {
    phase: String,
    message: String,
}

struct AppState {
    server: Mutex<Option<CommandChild>>,
    status: Mutex<BootStatus>,
}

fn dev_mode() -> bool {
    // `tauri dev` builds in debug; `tauri build` in release. This cleanly splits
    // "use devUrl, don't spawn a server" from "boot the bundled server".
    cfg!(debug_assertions)
}

/// Stop the bundled local Next server, if one is running. Idempotent.
///
/// Called from two places, and the second one is the reason this is a function:
///   1. `RunEvent::ExitRequested` — normal quit.
///   2. The updater's `on_before_exit` hook — the Windows NSIS updater launches
///      the installer and then calls `std::process::exit(0)` itself, which does
///      NOT run (1). Without this, the node.exe sidecar would survive as an
///      orphan AND keep the installed files locked, so the update could fail to
///      replace them.
pub(crate) fn shutdown_sidecar(app: &tauri::AppHandle) -> bool {
    let Some(state) = app.try_state::<AppState>() else {
        return false;
    };
    let child = state.server.lock().ok().and_then(|mut g| g.take());
    match child {
        Some(c) => {
            let _ = c.kill();
            true
        }
        None => false,
    }
}

fn host_is_trusted(host: &str) -> bool {
    TRUSTED_SUFFIXES
        .iter()
        .any(|s| host == *s || host.ends_with(&format!(".{s}")))
}

fn set_status(app: &tauri::AppHandle, phase: &str, message: &str) {
    let status = BootStatus {
        phase: phase.into(),
        message: message.into(),
    };
    if let Some(state) = app.try_state::<AppState>() {
        if let Ok(mut s) = state.status.lock() {
            *s = status.clone();
        }
    }
    let _ = app.emit("core://status", status);
}

#[tauri::command]
fn get_boot_status(state: tauri::State<AppState>) -> BootStatus {
    state.status.lock().map(|s| s.clone()).unwrap_or(BootStatus {
        phase: "unknown".into(),
        message: String::new(),
    })
}

fn reveal_logs(app: &tauri::AppHandle) -> Result<(), String> {
    let dir = app.path().app_log_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).ok();
    app.opener()
        .open_path(dir.to_string_lossy().to_string(), None::<&str>)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn open_logs_folder(app: tauri::AppHandle) -> Result<(), String> {
    reveal_logs(&app)
}

/// Native "Ayuda" menu — the sanctioned, non-invasive trigger for the technical
/// update panel. It adds a standard OS menu bar to the shell; it does NOT touch
/// or restyle the PrimeBuild Official Store web application.
fn build_app_menu(app: &tauri::AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let check = MenuItem::with_id(app, "pbc_check_updates", "Buscar actualizaciones…", true, None::<&str>)?;
    let panel = MenuItem::with_id(app, "pbc_update_panel", "Panel de actualización", true, None::<&str>)?;
    let logs = MenuItem::with_id(app, "pbc_view_logs", "Ver carpeta de logs", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let help = Submenu::with_items(app, "Ayuda", true, &[&check, &panel, &sep, &logs])?;
    Menu::with_items(app, &[&help])
}

pub fn run() {
    tauri::Builder::default()
        // Single-instance MUST be the first plugin: a second launch (from the
        // shortcut or from Platform Nexus) focuses the existing window instead of
        // starting a second main process + sidecar.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .manage(AppState {
            server: Mutex::new(None),
            status: Mutex::new(BootStatus {
                phase: "starting".into(),
                message: "Iniciando PrimeBuild Official Store…".into(),
            }),
        })
        .invoke_handler(tauri::generate_handler![
            get_boot_status,
            open_logs_folder,
            related::open_related_app,
            updater::get_version_info,
            updater::open_update_panel,
            updater::updater_check,
            updater::updater_download_and_install,
            updater::updater_relaunch
        ])
        .on_menu_event(|app, event| match event.id().as_ref() {
            "pbc_check_updates" => {
                let _ = updater::open_update_panel(app.clone());
                updater::spawn_background_check(app, false);
            }
            "pbc_update_panel" => {
                let _ = updater::open_update_panel(app.clone());
            }
            "pbc_view_logs" => {
                let _ = reveal_logs(app);
            }
            _ => {}
        })
        .setup(|app| {
            let handle = app.handle().clone();

            // ---- Local logging ------------------------------------------------
            let log_dir = handle
                .path()
                .app_log_dir()
                .unwrap_or_else(|_| std::env::temp_dir());
            std::fs::create_dir_all(&log_dir).ok();
            let logger = Logger::new(log_dir.join("primebuild-store-desktop.log"));
            let server_log = log_dir.join("primebuild-store-server.log");
            logger.log(
                "INFO",
                &format!(
                    "PrimeBuild Official Store desktop starting (shell v{}, mode={})",
                    env!("CARGO_PKG_VERSION"),
                    if dev_mode() { "dev" } else { "prod" }
                ),
            );

            // ---- Main window --------------------------------------------------
            // In dev we load the live Next dev server directly; in prod we start
            // on the bundled splash and navigate to the local server once ready.
            let initial_url = if dev_mode() {
                WebviewUrl::External("http://localhost:3000/".parse().unwrap())
            } else {
                WebviewUrl::App("index.html".into())
            };

            let nav_handle = handle.clone();
            let nav_logger = logger.clone();
            let window = WebviewWindowBuilder::new(app, "main", initial_url)
                .title("PrimeBuild Official Store")
                .inner_size(1440.0, 900.0)
                .min_inner_size(1100.0, 700.0)
                .resizable(true)
                .maximizable(true)
                .center()
                .visible(true)
                .on_navigation(move |url| {
                    match url.scheme() {
                        // Internal / local content — always allowed in-window.
                        "tauri" | "ipc" | "about" | "blob" | "data" => true,
                        "http" | "https" => {
                            let host = url.host_str().unwrap_or("");
                            // Loopback + Tauri's internal asset/ipc hosts
                            // (tauri.localhost, ipc.localhost, *.localhost) are
                            // in-window; everything else is external.
                            if host == "127.0.0.1"
                                || host == "localhost"
                                || host.ends_with(".localhost")
                            {
                                return true;
                            }
                            // External web link: open in the system browser,
                            // never in the Core window.
                            let _ = nav_handle.opener().open_url(url.to_string(), None::<&str>);
                            if host_is_trusted(host) {
                                nav_logger
                                    .log("INFO", &format!("Opened external (trusted) link: {host}"));
                            } else {
                                nav_logger.log(
                                    "WARN",
                                    &format!("Opened external (non-allowlisted) link: {host}"),
                                );
                            }
                            false
                        }
                        other => {
                            nav_logger.log(
                                "WARN",
                                &format!("Blocked navigation to unsupported scheme: {other}"),
                            );
                            false
                        }
                    }
                })
                .build()?;

            // Restore persisted size/position/maximized state. On first run there
            // is nothing to restore, so the centered defaults apply.
            let _ = window.restore_state(StateFlags::all());
            logger.log("INFO", "Main window created.");

            // Native "Ayuda" menu — the trigger for the technical update panel.
            match build_app_menu(&handle) {
                Ok(menu) => {
                    if let Err(e) = app.set_menu(menu) {
                        logger.log("WARN", &format!("Could not set app menu: {e}"));
                    }
                }
                Err(e) => logger.log("WARN", &format!("Could not build app menu: {e}")),
            }

            if dev_mode() {
                // The dev server is started by `beforeDevCommand`; nothing to boot.
                // The updater is a production-only feature (see updater.rs).
                set_status(&handle, "ready", "Dev server");
                return Ok(());
            }

            // Automatic update checks (production only), governed by the bundled
            // dist.config.json policy: an optional check shortly after start, then
            // periodically during long sessions. Non-blocking; only surfaces the
            // panel when an update is actually available.
            let policy = dist::load(&handle);
            if policy.check_on_startup {
                let startup_handle = handle.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(Duration::from_secs(8));
                    updater::spawn_background_check(&startup_handle, true);
                });
            }
            let periodic_handle = handle.clone();
            let period = Duration::from_secs(policy.check_frequency_hours.max(1) * 60 * 60);
            std::thread::spawn(move || loop {
                std::thread::sleep(period);
                updater::spawn_background_check(&periodic_handle, true);
            });

            // ---- Production: boot the bundled local Core server --------------
            let resource_dir = handle
                .path()
                .resource_dir()
                .map_err(|e| format!("resource dir unavailable: {e}"))?;
            let server_dir = resource_dir.join("server-dist");
            let server_js = server_dir.join("server.js");

            if !server_js.exists() {
                logger.log("ERROR", "Bundled server.js missing — cannot start Official Store server.");
                set_status(
                    &handle,
                    "error",
                    "El servidor local de PrimeBuild Official Store no está incluido en esta build.",
                );
                return Ok(());
            }

            let port = runtime::free_port();
            set_status(&handle, "starting_server", "Iniciando servicios locales…");
            logger.log("INFO", &format!("Starting local Official Store server on 127.0.0.1:{port}"));

            match runtime::spawn_server(&handle, &server_dir, &server_js, port, server_log.clone()) {
                Ok(child) => {
                    if let Some(state) = handle.try_state::<AppState>() {
                        if let Ok(mut guard) = state.server.lock() {
                            *guard = Some(child);
                        }
                    }
                }
                Err(e) => {
                    logger.log("ERROR", &format!("Failed to start Official Store server: {e}"));
                    set_status(
                        &handle,
                        "error",
                        "No se pudo iniciar el servidor local de PrimeBuild Official Store. Revisa los logs.",
                    );
                    return Ok(());
                }
            }

            // ---- Readiness watcher -------------------------------------------
            let ready_handle = handle.clone();
            let ready_logger = logger.clone();
            std::thread::spawn(move || {
                set_status(&ready_handle, "connecting", "Conectando…");
                let deadline = Instant::now() + Duration::from_secs(60);
                let mut ready = false;
                while Instant::now() < deadline {
                    if runtime::http_healthy(port) {
                        ready = true;
                        break;
                    }
                    std::thread::sleep(Duration::from_millis(500));
                }

                if let Some(win) = ready_handle.get_webview_window("main") {
                    if ready {
                        let url = format!("http://127.0.0.1:{port}/");
                        match url.parse() {
                            Ok(u) => {
                                let _ = win.navigate(u);
                                ready_logger
                                    .log("INFO", &format!("Server ready; loaded local Official Store at {url}"));
                                set_status(&ready_handle, "ready", "PrimeBuild Official Store está listo.");
                            }
                            Err(e) => {
                                ready_logger.log("ERROR", &format!("Bad local URL: {e}"));
                                set_status(&ready_handle, "error", "URL local inválida.");
                            }
                        }
                    } else {
                        ready_logger.log("ERROR", "Local server did not become ready within 60s.");
                        set_status(
                            &ready_handle,
                            "error",
                            "El servidor local de PrimeBuild Official Store no respondió a tiempo. Revisa los logs.",
                        );
                    }
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building the PrimeBuild Official Store desktop app")
        .run(|app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                // Stop the local server so no orphan process is left behind.
                shutdown_sidecar(app_handle);
            }
        });
}
