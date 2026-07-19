//! Runtime distribution policy for the PrimeBuild Official Store desktop shell.
//!
//! `dist.config.json` is bundled as a Tauri resource and read at runtime, so the
//! update channel, endpoint, check cadence and mandatory-update policy can be
//! adjusted by shipping a new config (or editing the installed resource) WITHOUT
//! rebuilding the Rust binary. It belongs to the distribution/update system and
//! never touches the PrimeBuild Official Store web application.
//!
//! Everything degrades to safe defaults when the file is missing (e.g. in dev):
//! no endpoint → the updater reports NOT_CONFIGURED; no mandatory updates.

use serde::Deserialize;
use tauri::{AppHandle, Manager};

#[derive(Clone, Debug, Deserialize)]
#[serde(default)]
pub struct DistConfig {
    pub channel: String,
    pub endpoint: String,
    pub check_on_startup: bool,
    pub check_frequency_hours: u64,
    pub min_supported_version: String,
    pub mandatory: bool,
    pub mandatory_reason: String,
}

impl Default for DistConfig {
    fn default() -> Self {
        Self {
            channel: "stable".into(),
            endpoint: String::new(),
            check_on_startup: true,
            check_frequency_hours: 6,
            min_supported_version: "0.0.0".into(),
            mandatory: false,
            mandatory_reason: String::new(),
        }
    }
}

// The JSON uses camelCase keys; map them explicitly.
mod raw {
    use serde::Deserialize;
    #[derive(Deserialize)]
    #[serde(default)]
    pub struct Raw {
        pub channel: String,
        pub endpoint: String,
        #[serde(rename = "checkOnStartup")]
        pub check_on_startup: bool,
        #[serde(rename = "checkFrequencyHours")]
        pub check_frequency_hours: u64,
        #[serde(rename = "minSupportedVersion")]
        pub min_supported_version: String,
        pub mandatory: bool,
        #[serde(rename = "mandatoryReason")]
        pub mandatory_reason: String,
    }
    impl Default for Raw {
        fn default() -> Self {
            let d = super::DistConfig::default();
            Self {
                channel: d.channel,
                endpoint: d.endpoint,
                check_on_startup: d.check_on_startup,
                check_frequency_hours: d.check_frequency_hours,
                min_supported_version: d.min_supported_version,
                mandatory: d.mandatory,
                mandatory_reason: d.mandatory_reason,
            }
        }
    }
}

/// Load the bundled distribution policy, falling back to safe defaults.
pub fn load(app: &AppHandle) -> DistConfig {
    let path = match app.path().resource_dir() {
        Ok(dir) => dir.join("dist.config.json"),
        Err(_) => return DistConfig::default(),
    };
    let text = match std::fs::read_to_string(&path) {
        Ok(t) => t,
        Err(_) => return DistConfig::default(),
    };
    match serde_json::from_str::<raw::Raw>(&text) {
        Ok(r) => DistConfig {
            channel: r.channel,
            endpoint: r.endpoint,
            check_on_startup: r.check_on_startup,
            check_frequency_hours: r.check_frequency_hours.max(1),
            min_supported_version: r.min_supported_version,
            mandatory: r.mandatory,
            mandatory_reason: r.mandatory_reason,
        },
        Err(_) => DistConfig::default(),
    }
}

/// Semver-ish "a < b" comparison for the mandatory-version gate. Non-numeric or
/// malformed parts compare as 0, and any pre-release suffix is ignored — good
/// enough to decide "installed is older than the minimum supported".
pub fn version_lt(a: &str, b: &str) -> bool {
    fn parts(v: &str) -> Vec<u64> {
        v.split('-')
            .next()
            .unwrap_or("")
            .split('.')
            .map(|p| p.parse::<u64>().unwrap_or(0))
            .collect()
    }
    let (pa, pb) = (parts(a), parts(b));
    for i in 0..pa.len().max(pb.len()) {
        let x = pa.get(i).copied().unwrap_or(0);
        let y = pb.get(i).copied().unwrap_or(0);
        if x != y {
            return x < y;
        }
    }
    false
}
