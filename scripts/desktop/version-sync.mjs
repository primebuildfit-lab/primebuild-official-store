// Keep the desktop version fingerprint in sync across every place it lives:
//   - package.json                (npm/app version)
//   - src-tauri/Cargo.toml         (Rust crate version -> CARGO_PKG_VERSION)
//   - src-tauri/tauri.conf.json    (bundle/installer/updater version)
//
// Usage:
//   node scripts/desktop/version-sync.mjs            # --check (verify in sync)
//   node scripts/desktop/version-sync.mjs --check    # verify all three match
//   node scripts/desktop/version-sync.mjs 0.2.1      # set all three to 0.2.1
//
// Exits non-zero on mismatch (in --check) or invalid input, so the release
// pipeline fails fast instead of shipping a mislabelled build.

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const files = {
  pkg: join(root, "package.json"),
  cargo: join(root, "src-tauri", "Cargo.toml"),
  conf: join(root, "src-tauri", "tauri.conf.json"),
};

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const die = (m) => { console.error(`[version-sync] ERROR: ${m}`); process.exit(1); };
const log = (m) => console.log(`[version-sync] ${m}`);

function readVersions() {
  const pkg = JSON.parse(readFileSync(files.pkg, "utf8"));
  const conf = JSON.parse(readFileSync(files.conf, "utf8"));
  const cargoText = readFileSync(files.cargo, "utf8");
  // First `version = "x"` line inside [package].
  const cargoMatch = cargoText.match(/^\s*version\s*=\s*"([^"]+)"/m);
  if (!cargoMatch) die("Could not find version in src-tauri/Cargo.toml");
  return { pkg: pkg.version, cargo: cargoMatch[1], conf: conf.version, _pkg: pkg, _conf: conf, _cargoText: cargoText };
}

function setVersion(next) {
  if (!SEMVER.test(next)) die(`"${next}" is not a valid semver`);
  const v = readVersions();

  v._pkg.version = next;
  writeFileSync(files.pkg, JSON.stringify(v._pkg, null, 2) + "\n");

  v._conf.version = next;
  writeFileSync(files.conf, JSON.stringify(v._conf, null, 2) + "\n");

  // Replace only the [package] version line (the first `version = "..."`).
  const cargoText = v._cargoText.replace(/^(\s*version\s*=\s*)"[^"]+"/m, `$1"${next}"`);
  writeFileSync(files.cargo, cargoText);

  log(`Set version to ${next} in package.json, Cargo.toml, tauri.conf.json`);
}

function check() {
  const v = readVersions();
  const all = [v.pkg, v.cargo, v.conf];
  if (!SEMVER.test(v.pkg)) die(`package.json version "${v.pkg}" is not valid semver`);
  if (new Set(all).size !== 1) {
    die(`Version mismatch — package.json=${v.pkg} Cargo.toml=${v.cargo} tauri.conf.json=${v.conf}`);
  }
  log(`In sync at v${v.pkg}`);
  return v.pkg;
}

const arg = process.argv[2];
if (!arg || arg === "--check") {
  check();
} else {
  setVersion(arg);
  check();
}
