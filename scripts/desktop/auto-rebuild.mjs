// PrimeBuild Official Store — automatic desktop rebuild ("Tauri automático").
//
// Watches the application source and, whenever it changes, automatically
// regenerates the desktop app: a fresh standalone web payload + Rust build +
// NSIS installer. Leave it running and every code change produces an up-to-date
// installer with no manual step.
//
// Usage:
//   node scripts/desktop/auto-rebuild.mjs            # watch + auto rebuild (installer only, fast)
//   node scripts/desktop/auto-rebuild.mjs --once     # build a single installer and exit
//   node scripts/desktop/auto-rebuild.mjs --gated    # run typecheck/lint/test before each build
//   node scripts/desktop/auto-rebuild.mjs --debounce 5000
//
// It never signs and never publishes; it produces the local *-setup.exe via the
// existing guarded release pipeline (release.mjs --no-sign). Signing/publishing
// stays a deliberate, separate human step (see `pnpm desktop:release`).

import { spawn } from "node:child_process";
import { watch, existsSync, statSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => {
  const i = args.indexOf(n);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

const ONCE = flag("--once");
const GATED = flag("--gated");
const DEBOUNCE_MS = Number(opt("--debounce", "3000"));

// Source trees worth rebuilding for. Everything else (build output, deps) is
// ignored so a rebuild never re-triggers itself.
const WATCH_DIRS = ["src", "public", "scripts", join("src-tauri", "src")];
const IGNORE = [
  "node_modules",
  ".next",
  ".git",
  "target",
  "server-dist",
  "gen",
  "bundle",
  "tsconfig.tsbuildinfo",
];

const nsisDir = join(root, "src-tauri", "target", "release", "bundle", "nsis");

const c = { cyan: "\x1b[36m", green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m", dim: "\x1b[2m", reset: "\x1b[0m" };
const ts = () => new Date().toLocaleTimeString("es");
const log = (m) => console.log(`${c.cyan}[auto-rebuild ${ts()}]${c.reset} ${m}`);
const ok = (m) => console.log(`${c.green}[auto-rebuild ${ts()}]${c.reset} ${m}`);
const warn = (m) => console.log(`${c.yellow}[auto-rebuild ${ts()}]${c.reset} ${m}`);
const errlog = (m) => console.log(`${c.red}[auto-rebuild ${ts()}]${c.reset} ${m}`);

function ignored(path) {
  return IGNORE.some((seg) => path.split(/[\\/]/).includes(seg));
}

function latestInstaller() {
  if (!existsSync(nsisDir)) return null;
  const setup = readdirSync(nsisDir)
    .filter((f) => f.endsWith("-setup.exe"))
    .map((f) => ({ f, m: statSync(join(nsisDir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m)[0];
  return setup ? setup.f : null;
}

// ---- Build runner (serialized; coalesces changes during a build) ----------
let building = false;
let pendingChange = false;

function runBuild() {
  if (building) {
    pendingChange = true;
    return;
  }
  building = true;
  const start = Date.now();
  const releaseArgs = ["scripts/desktop/release.mjs", "--no-sign"];
  if (!GATED) releaseArgs.push("--skip-gates");

  log(`Rebuilding desktop installer${GATED ? " (gated)" : ""}…`);
  const child = spawn(process.execPath, releaseArgs, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, PBOS_CHANNEL: process.env.PBOS_CHANNEL || "auto" },
  });

  child.on("exit", (code) => {
    building = false;
    const secs = ((Date.now() - start) / 1000).toFixed(0);
    if (code === 0) {
      const installer = latestInstaller();
      ok(`Rebuild complete in ${secs}s → ${installer ?? "installer produced"}`);
      ok(`${c.dim}Location: src-tauri/target/release/bundle/nsis/${c.reset}`);
    } else {
      errlog(`Rebuild failed (exit ${code}). Fix the error above; the next save will retry.`);
    }
    if (ONCE) {
      process.exit(code ?? 0);
    }
    if (pendingChange) {
      pendingChange = false;
      warn("Changes arrived during the build — rebuilding again…");
      runBuild();
    }
  });
}

// ---- Debounced change handler ---------------------------------------------
let timer = null;
function scheduleBuild(reason) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    log(`Change detected (${reason}). Starting rebuild…`);
    runBuild();
  }, DEBOUNCE_MS);
}

// ---- Entry -----------------------------------------------------------------
console.log(`${c.cyan}PrimeBuild Official Store — automatic desktop rebuild${c.reset}`);
if (ONCE) {
  log("Single build (--once).");
  runBuild();
} else {
  log(`Watching: ${WATCH_DIRS.join(", ")}`);
  log(`Debounce: ${DEBOUNCE_MS}ms · Gates: ${GATED ? "on" : "off"} · Signing: off`);
  log("Building an initial installer, then watching for changes… (Ctrl+C to stop)");

  for (const rel of WATCH_DIRS) {
    const dir = join(root, rel);
    if (!existsSync(dir)) continue;
    try {
      watch(dir, { recursive: true }, (_event, filename) => {
        if (!filename) return;
        const path = join(rel, filename.toString());
        if (ignored(path)) return;
        scheduleBuild(path);
      });
    } catch (e) {
      warn(`Could not watch ${rel}: ${e instanceof Error ? e.message : e}`);
    }
  }

  // Kick off an initial build so there is always a current installer.
  runBuild();

  process.on("SIGINT", () => {
    console.log(`\n${c.cyan}[auto-rebuild]${c.reset} Stopped. Latest installer: ${latestInstaller() ?? "none"}`);
    process.exit(0);
  });
}
