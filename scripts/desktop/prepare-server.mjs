// Prepare the self-contained PrimeBuild Official Store server payload for the
// Tauri desktop bundle.
//
// Runs a Next.js "standalone" production build, then assembles
// `src-tauri/server-dist/` so it can be launched offline with a bundled Node
// runtime as `node server.js`. Also stages the Node sidecar binary that Tauri
// bundles.
//
// PrimeBuild Official Store has NO local database — it reads the live Shopify
// store over HTTPS at runtime and otherwise shows honest empty states. So this
// script stages no database client of any kind.
//
// Invoked by Tauri's `beforeBuildCommand` (and directly via `pnpm desktop:build`).

import { execSync } from "node:child_process";
import { existsSync, rmSync, mkdirSync, cpSync, copyFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");
const TRIPLE = "x86_64-pc-windows-msvc"; // Windows x64 (matches rustc default host)

const log = (m) => console.log(`[prepare-server] ${m}`);
const fail = (m) => {
  console.error(`[prepare-server] ERROR: ${m}`);
  process.exit(1);
};

const p = {
  standalone: join(root, ".next", "standalone"),
  staticDir: join(root, ".next", "static"),
  publicDir: join(root, "public"),
  dest: join(root, "src-tauri", "server-dist"),
  binaries: join(root, "src-tauri", "binaries"),
};

// 1) Standalone production build (opt-in output via PBOS_DESKTOP_BUILD).
log("Building Next.js (standalone output)…");
execSync("pnpm exec next build", {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, PBOS_DESKTOP_BUILD: "1", NODE_ENV: "production" },
});

if (!existsSync(join(p.standalone, "server.js"))) {
  fail("`.next/standalone/server.js` was not produced — standalone output missing.");
}

// 2) Assemble server-dist from the standalone tree.
log("Assembling src-tauri/server-dist …");
rmSync(p.dest, { recursive: true, force: true });
mkdirSync(p.dest, { recursive: true });
cpSync(p.standalone, p.dest, { recursive: true });

// Standalone omits the static assets and public/ — copy them in.
if (existsSync(p.staticDir)) {
  cpSync(p.staticDir, join(p.dest, ".next", "static"), { recursive: true });
} else {
  fail(".next/static missing — cannot serve client assets.");
}
if (existsSync(p.publicDir)) {
  cpSync(p.publicDir, join(p.dest, "public"), { recursive: true });
}

// 3) Force CommonJS resolution for the standalone server.js. The repo root
// package.json has "type":"module"; a minimal package.json (no type) makes node
// treat server.js as CJS.
writeFileSync(
  join(p.dest, "package.json"),
  JSON.stringify({ name: "primebuild-store-standalone", private: true }, null, 2) + "\n",
);

// 4) Stage the Node sidecar Tauri will bundle. Reuse the Node running this
// script so the installed app never depends on a system Node install.
mkdirSync(p.binaries, { recursive: true });
const sidecar = join(p.binaries, `node-${TRIPLE}.exe`);
copyFileSync(process.execPath, sidecar);
log(`Staged Node sidecar (${process.version}) at binaries/node-${TRIPLE}.exe`);

log("Done. server-dist is ready for `tauri build`.");
