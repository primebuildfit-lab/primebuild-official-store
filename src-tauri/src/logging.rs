//! Minimal, dependency-free local logger for the PrimeBuild Official Store shell.
//!
//! Writes timestamped lines to a file in the OS app-log directory. Only shell
//! lifecycle events are logged here (start, readiness, errors, app opens). The
//! shell never logs secrets, tokens, cookies or request bodies — in particular
//! the read-only Shopify Admin token is never written to any log.

use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, Manager};

/// Single log file shared by the shell and the update engine, so a support
/// bundle only ever needs one file to explain a failed update.
pub const LOG_FILE: &str = "primebuild-store-desktop.log";

#[derive(Clone)]
pub struct Logger {
    path: PathBuf,
}

impl Logger {
    /// Logger pointed at the OS app-log directory, falling back to the temp dir
    /// so logging never itself becomes a failure path.
    pub fn for_app(app: &AppHandle) -> Self {
        let dir = app
            .path()
            .app_log_dir()
            .unwrap_or_else(|_| std::env::temp_dir());
        Self::new(dir.join(LOG_FILE))
    }

    pub fn new(path: PathBuf) -> Self {
        if let Some(dir) = path.parent() {
            let _ = std::fs::create_dir_all(dir);
        }
        Self { path }
    }

    pub fn log(&self, level: &str, msg: &str) {
        let line = format!("[{}] {:<5} {}\n", now_utc(), level, msg);
        if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(&self.path) {
            let _ = f.write_all(line.as_bytes());
        }
    }
}

/// RFC3339-ish UTC timestamp with no external crates.
fn now_utc() -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    let secs = now.as_secs();
    let millis = now.subsec_millis();
    let days = (secs / 86_400) as i64;
    let rem = (secs % 86_400) as i64;
    let (h, mi, s) = (rem / 3600, (rem % 3600) / 60, rem % 60);
    let (y, m, d) = civil_from_days(days);
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z",
        y, m, d, h, mi, s, millis
    )
}

/// Howard Hinnant's days-to-civil-date algorithm.
fn civil_from_days(z: i64) -> (i64, u32, u32) {
    let z = z + 719_468;
    let era = (if z >= 0 { z } else { z - 146_096 }) / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = (if mp < 10 { mp + 3 } else { mp - 9 }) as u32;
    (if m <= 2 { y + 1 } else { y }, m, d)
}
