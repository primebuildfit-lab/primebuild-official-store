/**
 * The canonical product version (PBOS-RUNTIME-CLOSE-001). Injected at build time
 * from package.json — the single source that scripts/desktop/version-sync.mjs
 * propagates to src-tauri/Cargo.toml and src-tauri/tauri.conf.json — via
 * next.config's `env.APP_VERSION`. `/api/health` and the app identity both read
 * this, so there is never a second manually-maintained version. The fallback is
 * only reached outside a Next build (unit tests / tooling), never in the shipped
 * app or installer.
 */
export const PRODUCT_VERSION: string = process.env.APP_VERSION ?? "0.0.0-dev";
