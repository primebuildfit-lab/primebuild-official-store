import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Next.js configuration for PrimeBuild Official Store.
 *
 * Desktop (Tauri) packaging only: when PBOS_DESKTOP_BUILD is set, emit a
 * self-contained `.next/standalone` server so the Tauri bundle can run the app
 * offline from a bundled Node runtime. Unset (normal web) builds are unchanged —
 * this is opt-in and never alters app behavior.
 *
 * Version: APP_VERSION is injected from package.json — the single canonical
 * product version (version-sync propagates it to Cargo.toml and tauri.conf.json).
 * src/config/version.ts reads it, so /api/health always reports the same version
 * as the executable/installer, with no second manually-maintained source.
 */
const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
  version: string;
};

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: { APP_VERSION: pkg.version },
  ...(process.env.PBOS_DESKTOP_BUILD ? { output: "standalone" as const } : {}),
};

export default nextConfig;
