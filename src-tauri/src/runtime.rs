//! Local PrimeBuild Official Store server lifecycle for the desktop shell.
//!
//! The Official Store is a Next.js app that needs its own Node server (server
//! components, dynamic routes, the /api/health probe), so the desktop build ships
//! a self-contained standalone server and a bundled Node runtime. This module
//! starts that server bound to 127.0.0.1 on a free port, exposes a health probe,
//! and hands back a killable child so the shell can stop it on exit.
//!
//! The Official Store has no local database — it reads the live Shopify store over
//! HTTPS — so only the read-only Shopify credentials are forwarded to the server.

use std::collections::HashMap;
use std::fs::OpenOptions;
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::time::Duration;

use tauri::AppHandle;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

/// Ask the OS for an unused loopback port. Small TOCTOU window is acceptable —
/// the server binds immediately after and readiness polling confirms it.
pub fn free_port() -> u16 {
    TcpListener::bind("127.0.0.1:0")
        .and_then(|l| l.local_addr())
        .map(|a| a.port())
        .unwrap_or(37_517)
}

/// Probe the local Official Store health endpoint. Loopback only.
pub fn http_healthy(port: u16) -> bool {
    let addr: SocketAddr = match format!("127.0.0.1:{port}").parse() {
        Ok(a) => a,
        Err(_) => return false,
    };
    if let Ok(mut s) = TcpStream::connect_timeout(&addr, Duration::from_millis(700)) {
        let _ = s.set_read_timeout(Some(Duration::from_millis(1500)));
        let _ = s.set_write_timeout(Some(Duration::from_millis(1000)));
        let req = "GET /api/health HTTP/1.0\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n";
        if s.write_all(req.as_bytes()).is_ok() {
            let mut buf = String::new();
            let _ = s.read_to_string(&mut buf);
            let status_line = buf.lines().next().unwrap_or("");
            return status_line.contains(" 200") || buf.contains("\"status\":\"healthy\"");
        }
    }
    false
}

/// Spawn the bundled standalone Next server via the bundled Node sidecar.
/// Returns a killable child handle. Server stdout/stderr is appended to
/// `server_log`; the Shopify token is never printed to it.
pub fn spawn_server(
    app: &AppHandle,
    server_dir: &Path,
    server_js: &Path,
    port: u16,
    server_log: PathBuf,
) -> Result<CommandChild, String> {
    let mut envs: HashMap<String, String> = HashMap::new();
    envs.insert("PORT".into(), port.to_string());
    // Bind to loopback only — never expose Core to the local network.
    envs.insert("HOSTNAME".into(), "127.0.0.1".into());
    envs.insert("NODE_ENV".into(), "production".into());
    envs.insert("NEXT_TELEMETRY_DISABLED".into(), "1".into());

    // Forward the read-only Shopify credentials from the desktop environment so
    // the packaged app reads the SAME live storefront as the web app. These are
    // read from the process environment (set by the OS/user), never bundled or
    // hardcoded, and the token is never logged. Without them the app still runs,
    // showing honest "store not connected" states.
    for key in [
        "SHOPIFY_STORE_DOMAIN",
        "SHOPIFY_ADMIN_ACCESS_TOKEN",
        "SHOPIFY_API_VERSION",
    ] {
        if let Ok(val) = std::env::var(key) {
            if !val.is_empty() {
                envs.insert(key.to_string(), val);
            }
        }
    }

    // Pass the entry as a RELATIVE name with the working directory set to the
    // server dir. Passing an absolute Windows path (drive letter + backslashes)
    // trips a Node realpath quirk on entry resolution (`EISDIR: lstat 'C:'`).
    let _ = server_js; // kept for signature clarity; resolution is cwd-relative
    let command = app
        .shell()
        .sidecar("node")
        .map_err(|e| format!("node sidecar unavailable: {e}"))?
        .current_dir(server_dir)
        .envs(envs)
        .args(["server.js".to_string()]);

    let (mut rx, child) = command
        .spawn()
        .map_err(|e| format!("failed to spawn Official Store server: {e}"))?;

    // Drain the server's output into a dedicated log so the OS pipe never fills
    // and so failures are diagnosable.
    tauri::async_runtime::spawn(async move {
        if let Some(dir) = server_log.parent() {
            let _ = std::fs::create_dir_all(dir);
        }
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(bytes) | CommandEvent::Stderr(bytes) => {
                    if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(&server_log)
                    {
                        let _ = f.write_all(&bytes);
                    }
                }
                CommandEvent::Terminated(payload) => {
                    if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(&server_log)
                    {
                        let _ = writeln!(f, "\n[shell] server process terminated: {:?}", payload.code);
                    }
                }
                _ => {}
            }
        }
    });

    Ok(child)
}
