// PrimeBuild Official Store — desktop release pipeline (guarded, stale-proof).
//
// Runs the official build sequence and refuses to ship a mislabelled or stale
// bundle:
//
//   [version sync] -> gates -> clean web output -> tauri build (fresh web +
//   Rust) -> validate outputs -> sign (updater artifacts) -> latest.json
//   manifest -> checksums
//
// Usage:
//   node scripts/desktop/release.mjs 0.2.1               # bump + full signed release
//   node scripts/desktop/release.mjs --no-sign           # keep current version, installer only
//   node scripts/desktop/release.mjs 0.2.1 --skip-gates  # skip typecheck/lint/test
//   node scripts/desktop/release.mjs --notes "Fix X"     # custom release notes
//
// Signing (updater) needs these in the environment; otherwise pass --no-sign:
//   TAURI_SIGNING_PRIVATE_KEY       (or _PATH)
//   TAURI_SIGNING_PRIVATE_KEY_PASSWORD
//
// The private key must ONLY ever come from a secret store / local key file —
// never committed. This script reads it from the environment and never prints it.
//
// The signed path merges src-tauri/tauri.release.conf.json over the base config
// to turn on `bundle.createUpdaterArtifacts` (the *-setup.nsis.zip + .sig the
// updater consumes). It is kept out of the base config so a plain
// `pnpm desktop:build` still works with no signing key present.
// NOTE: that overlay must contain ONLY real Tauri config keys — the schema
// rejects unknown properties (a stray "$comment" there fails every signed
// build with `Additional properties are not allowed`).

import { execSync } from "node:child_process";
import { existsSync, rmSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const bundleDir = join(root, "src-tauri", "target", "release", "bundle");
const nsisDir = join(bundleDir, "nsis");

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const version = args.find((a) => /^\d+\.\d+\.\d+/.test(a));
const noSign = flag("--no-sign");
const skipGates = flag("--skip-gates");
const notesArg = opt("--notes");

const log = (m) => console.log(`\n\x1b[36m[release] ${m}\x1b[0m`);
const ok = (m) => console.log(`\x1b[32m  [OK] ${m}\x1b[0m`);
const die = (m) => { console.error(`\x1b[31m[release] ERROR: ${m}\x1b[0m`); process.exit(1); };
const run = (cmd, env = {}) => execSync(cmd, { cwd: root, stdio: "inherit", env: { ...process.env, ...env } });

// ---- 1. Version -----------------------------------------------------------
if (version) {
  log(`Setting version to ${version}`);
  run(`node scripts/desktop/version-sync.mjs ${version}`);
} else {
  log("Verifying version is in sync");
  run(`node scripts/desktop/version-sync.mjs --check`);
}
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const ver = pkg.version;
ok(`Version v${ver}`);

// ---- 2. Signing preflight -------------------------------------------------
if (!noSign) {
  const hasKey = process.env.TAURI_SIGNING_PRIVATE_KEY || process.env.TAURI_SIGNING_PRIVATE_KEY_PATH;
  if (!hasKey) {
    die(
      "No signing key in environment. Set TAURI_SIGNING_PRIVATE_KEY(_PATH) and " +
        "TAURI_SIGNING_PRIVATE_KEY_PASSWORD, or run with --no-sign for an installer-only build."
    );
  }
  ok("Signing key present (value never printed)");
}

// ---- 3. Gates -------------------------------------------------------------
if (!skipGates) {
  log("Running gates: typecheck, lint, test");
  run("pnpm typecheck");
  run("pnpm lint");
  run("pnpm test");
  ok("Gates passed");
} else {
  log("Skipping gates (--skip-gates)");
}

// ---- 4. Clean previous web + bundle output --------------------------------
log("Cleaning previous outputs (.next, server-dist, bundle)");
for (const d of [join(root, ".next"), join(root, "src-tauri", "server-dist"), bundleDir]) {
  rmSync(d, { recursive: true, force: true });
}
ok("Clean");

// ---- 5. Build (fresh web via beforeBuildCommand + Rust) -------------------
const buildStart = Date.now();
const fingerprint = {
  PBC_BUILD_DATE: new Date().toISOString().slice(0, 10),
  PBC_CHANNEL: process.env.PBC_CHANNEL || "stable",
  PBC_BUILD_NUMBER: process.env.PBC_BUILD_NUMBER || String(Date.now()),
  // Se reenvía explícitamente: sin esto, `build.rs` cae en su detección por git
  // y el SHA que CI quería sellar se pierde.
  ...(process.env.PBC_GIT_COMMIT ? { PBC_GIT_COMMIT: process.env.PBC_GIT_COMMIT } : {}),
};
log(`Building desktop bundle${noSign ? " (installer only, unsigned)" : " (signed + updater artifacts)"}`);
const configFlag = noSign ? "" : "--config src-tauri/tauri.release.conf.json";
run(`pnpm exec tauri build ${configFlag}`.trim(), fingerprint);

// ---- 6. Validate outputs (stale-proof) ------------------------------------
log("Validating outputs");
const serverJs = join(root, "src-tauri", "server-dist", "server.js");
if (!existsSync(serverJs)) die("server-dist/server.js missing — the web app was not rebuilt.");
if (statSync(serverJs).mtimeMs < buildStart - 5000) die("server-dist looks stale (older than this build).");
ok("Fresh web payload present");

if (!existsSync(nsisDir)) die("NSIS bundle dir missing — installer not produced.");
const installer = readdirSync(nsisDir).find((f) => f.endsWith("-setup.exe"));
if (!installer) die("No *-setup.exe produced.");
const installerPath = join(nsisDir, installer);
if (statSync(installerPath).size < 1_000_000) die("Installer is suspiciously small (<1MB).");
if (statSync(installerPath).mtimeMs < buildStart - 5000) die("Installer is stale (predates this build).");
ok(`Installer: ${installer}`);

let manifestPath = null;
if (!noSign) {
  // Tauri 2.x signs the NSIS *installer itself*; the updater downloads that
  // .exe and verifies it against the detached .sig. (Only the legacy
  // `v1Compatible` mode produced a *-setup.nsis.zip — do not look for one.)
  const sig = readdirSync(nsisDir).find((f) => f.endsWith("-setup.exe.sig"));
  if (!sig) die("Signature *-setup.exe.sig missing — signing did not run (createUpdaterArtifacts not applied?).");
  ok(`Updater artifact: ${installer}`);
  ok(`Signature: ${sig}`);

  // ---- 7. Manifest (latest.json) -----------------------------------------
  const signature = readFileSync(join(nsisDir, sig), "utf8").trim();
  const base =
    process.env.RELEASE_DOWNLOAD_BASE ||
    `https://github.com/primebuildfit-lab/primebuild-official-store/releases/download/store-v${ver}`;
  const notes = resolveNotes(ver);
  const manifest = {
    version: ver,
    notes,
    pub_date: new Date().toISOString(),
    platforms: {
      "windows-x86_64": { signature, url: `${base}/${githubAssetName(installer)}` },
    },
  };
  // Named latest-store.json, NOT latest.json: this repo is shared with other
  // ecosystem apps, and `releases/latest/download/<name>` resolves against the
  // most recent release in the WHOLE repo. A per-app manifest name keeps the
  // Store from ever being served another app's manifest.
  manifestPath = join(bundleDir, "latest-store.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  ok(`Manifest: ${manifestPath}`);
}

// ---- 8. Checksums ---------------------------------------------------------
log("Checksums (SHA-256)");
const sha256 = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
for (const a of [installerPath]) console.log(`  ${sha256(a)}  ${basename(a)}`);

log(`Done. Release v${ver} built at ${bundleDir}`);
if (!noSign && manifestPath) {
  console.log(
    "\nNext step to publish (normally done by CI on a store-v* tag):\n" +
      `  1. Create a GitHub Release tagged  store-v${ver}  on\n` +
      "     primebuildfit-lab/primebuild-official-store\n" +
      "  2. Upload the assets:  *-setup.exe, *-setup.exe.sig  and  latest-store.json\n" +
      "  3. Re-point the FIXED tag `store-latest` at this latest-store.json:\n" +
      "       gh release upload store-latest latest-store.json --clobber\n" +
      "     The updater reads that fixed tag, NOT releases/latest, so another\n" +
      "     app publishing can never steal this app's manifest."
  );
}

// ---------------------------------------------------------------------------
// GitHub rewrites release-asset filenames on upload: every character outside
// [A-Za-z0-9._-] becomes a dot. Our installer is "PrimeBuild Official
// Store_x.y.z_x64-setup.exe", so it lands as "PrimeBuild.Official.Store_...".
// The manifest MUST point at that rewritten name — percent-encoding the spaces
// instead yields a 404 and silently breaks every update.
function githubAssetName(name) {
  return name.replace(/[^A-Za-z0-9._-]/g, ".");
}

function resolveNotes(v) {
  if (notesArg) return notesArg;
  const changelog = join(root, "CHANGELOG.md");
  if (existsSync(changelog)) {
    const text = readFileSync(changelog, "utf8");
    // Grab the section under a heading containing this version.
    const re = new RegExp(`##[^\\n]*${v.replace(/\./g, "\\.")}[^\\n]*\\n([\\s\\S]*?)(?:\\n##\\s|$)`);
    const m = text.match(re);
    if (m) return m[1].trim().slice(0, 2000);
  }
  return `PrimeBuild Official Store v${v}`;
}
