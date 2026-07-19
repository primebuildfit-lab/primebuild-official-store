//! Build script for the PrimeBuild Official Store desktop shell.
//!
//! Besides the standard `tauri_build::build()`, this emits build-time version
//! metadata as compile-time environment variables so the desktop shell can show
//! an unambiguous, verifiable version fingerprint in the technical update panel
//! (commit, build date, channel, build number). None of this touches the
//! PrimeBuild Official Store web application — it is desktop-shell metadata only.
//!
//! Values are taken from the environment first (set by the release pipeline),
//! then derived locally (git commit, current date) so a plain `cargo build`
//! still produces sensible values.

use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

fn env_or(key: &str, fallback: impl FnOnce() -> String) -> String {
    match std::env::var(key) {
        Ok(v) if !v.trim().is_empty() => v,
        _ => fallback(),
    }
}

/// Short git commit for the working tree, or "unknown" if git is unavailable.
fn git_commit() -> String {
    Command::new("git")
        .args(["rev-parse", "--short", "HEAD"])
        .output()
        .ok()
        .filter(|o| o.status.success())
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "unknown".into())
}

/// UTC `YYYY-MM-DD` from the current system time, no external date deps.
/// Uses Howard Hinnant's civil-from-days algorithm.
fn today_utc() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    let days = secs.div_euclid(86_400);
    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    format!("{y:04}-{m:02}-{d:02}")
}

fn main() {
    // Re-run when these inputs change so the fingerprint stays fresh.
    println!("cargo:rerun-if-changed=../.git/HEAD");
    println!("cargo:rerun-if-env-changed=PBC_GIT_COMMIT");
    println!("cargo:rerun-if-env-changed=PBC_BUILD_DATE");
    println!("cargo:rerun-if-env-changed=PBC_CHANNEL");
    println!("cargo:rerun-if-env-changed=PBC_BUILD_NUMBER");

    let commit = env_or("PBC_GIT_COMMIT", git_commit);
    let build_date = env_or("PBC_BUILD_DATE", today_utc);
    let channel = env_or("PBC_CHANNEL", || "stable".to_string());
    let build_number = env_or("PBC_BUILD_NUMBER", || "local".to_string());

    println!("cargo:rustc-env=PBC_GIT_COMMIT={commit}");
    println!("cargo:rustc-env=PBC_BUILD_DATE={build_date}");
    println!("cargo:rustc-env=PBC_CHANNEL={channel}");
    println!("cargo:rustc-env=PBC_BUILD_NUMBER={build_number}");

    tauri_build::build()
}
