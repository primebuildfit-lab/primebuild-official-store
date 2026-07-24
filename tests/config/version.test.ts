import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { app } from "@/config/app";
import { PRODUCT_VERSION } from "@/config/version";

/**
 * The product version has ONE canonical source (package.json), propagated by
 * version-sync to Cargo.toml and tauri.conf.json, and injected into the running
 * app (and therefore /api/health) via next.config's APP_VERSION. This guards
 * against the previously-observed drift where /api/health reported a different
 * version than the executable/installer.
 */
describe("canonical product version (PBOS-RUNTIME-CLOSE-001)", () => {
  const root = process.cwd();
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { version: string };
  const tauri = JSON.parse(readFileSync(join(root, "src-tauri", "tauri.conf.json"), "utf8")) as {
    version: string;
  };
  const cargoToml = readFileSync(join(root, "src-tauri", "Cargo.toml"), "utf8");
  const cargoVersion = /^version\s*=\s*"([^"]+)"/m.exec(cargoToml)?.[1];

  it("package.json, Cargo.toml and tauri.conf.json share one version", () => {
    expect(tauri.version).toBe(pkg.version);
    expect(cargoVersion).toBe(pkg.version);
  });

  it("health reads the build-injected APP_VERSION, not a hardcoded number", () => {
    // /api/health returns app.version, which is PRODUCT_VERSION (env-injected).
    expect(app.version).toBe(PRODUCT_VERSION);
    // In a build, APP_VERSION === package.json version → health === canonical.
    // Fails if a health/app version is ever hardcoded away from the injected source.
    if (process.env.APP_VERSION) {
      expect(app.version).toBe(pkg.version);
    } else {
      expect(app.version).toBe("0.0.0-dev"); // only outside a Next build
    }
  });

  it("next.config injects APP_VERSION from package.json (the health source)", () => {
    const cfg = readFileSync(join(root, "next.config.ts"), "utf8");
    expect(cfg).toMatch(/APP_VERSION:\s*pkg\.version/);
  });
});
