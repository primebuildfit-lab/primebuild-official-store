//! Related-app opener.
//!
//! Prepares the architecture for the Official Store to open sibling PrimeBuild
//! ecosystem apps (PrimeBuild Internal OS, and — if ever installed — Eventra /
//! Partnera admins) via their registered URL schemes, WITHOUT modifying or
//! bundling those projects here. Detection is real: we check the Windows registry
//! for a
//! registered protocol handler. If not installed, we honestly report
//! "not installed" and fall back only to an explicitly configured URL
//! (env var) — never an invented path, and never a silent failure.

use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

#[derive(Serialize)]
pub struct RelatedAppStatus {
    pub id: String,
    pub installed: bool,
    pub scheme: Option<String>,
    pub fallback_url: Option<String>,
    pub opened: bool,
    /// One of: opened | opened_fallback | not_installed | error | unknown
    pub status: String,
    pub message: String,
}

#[cfg(windows)]
fn scheme_registered(scheme: &str) -> bool {
    use winreg::enums::{HKEY_CLASSES_ROOT, HKEY_CURRENT_USER};
    use winreg::RegKey;

    // A URL-protocol handler lives under HKCR\<scheme> with a "URL Protocol" value,
    // or under HKCU\Software\Classes\<scheme> for a per-user registration.
    let hkcr = RegKey::predef(HKEY_CLASSES_ROOT);
    if let Ok(key) = hkcr.open_subkey(scheme) {
        if key.get_value::<String, _>("URL Protocol").is_ok() {
            return true;
        }
    }
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok(key) = hkcu.open_subkey(format!("Software\\Classes\\{scheme}")) {
        if key.get_value::<String, _>("URL Protocol").is_ok() {
            return true;
        }
    }
    false
}

#[cfg(not(windows))]
fn scheme_registered(_scheme: &str) -> bool {
    false
}

/// Resolve the scheme + optional configured fallback URL for a known app id.
fn app_targets(id: &str) -> Option<(&'static str, &'static str)> {
    match id {
        // (url scheme, env var holding an explicit fallback URL)
        "internalos" => Some(("primebuild-internalos", "PBSTORE_INTERNALOS_URL")),
        "eventra" => Some(("eventra-admin", "PBSTORE_EVENTRA_URL")),
        "partnera" => Some(("partnera-admin", "PBSTORE_PARTNERA_URL")),
        _ => None,
    }
}

#[tauri::command]
pub fn open_related_app(app: AppHandle, id: String) -> RelatedAppStatus {
    let (scheme, env_key) = match app_targets(&id) {
        Some(t) => t,
        None => {
            return RelatedAppStatus {
                id,
                installed: false,
                scheme: None,
                fallback_url: None,
                opened: false,
                status: "unknown".into(),
                message: "Unknown app id.".into(),
            }
        }
    };

    let fallback = std::env::var(env_key).ok().filter(|s| !s.is_empty());

    if scheme_registered(scheme) {
        let url = format!("{scheme}://");
        let opened = app.opener().open_url(url, None::<&str>).is_ok();
        return RelatedAppStatus {
            id,
            installed: true,
            scheme: Some(scheme.into()),
            fallback_url: fallback,
            opened,
            status: if opened { "opened".into() } else { "error".into() },
            message: if opened {
                format!("Opened installed app via {scheme}://")
            } else {
                "App is registered but could not be opened.".into()
            },
        };
    }

    // Not installed. Only open a fallback that was explicitly configured.
    if let Some(url) = fallback.clone() {
        let opened = app.opener().open_url(url, None::<&str>).is_ok();
        return RelatedAppStatus {
            id,
            installed: false,
            scheme: Some(scheme.into()),
            fallback_url: fallback,
            opened,
            status: if opened {
                "opened_fallback".into()
            } else {
                "error".into()
            },
            message: if opened {
                "App not installed — opened the configured fallback URL.".into()
            } else {
                "App not installed and the configured fallback URL failed to open.".into()
            },
        };
    }

    RelatedAppStatus {
        id,
        installed: false,
        scheme: Some(scheme.into()),
        fallback_url: None,
        opened: false,
        status: "not_installed".into(),
        message: "No instalada. No hay URL de reserva configurada.".into(),
    }
}
