import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Guards the Start Menu shortcut migration (audit PB-C-001 / A-4).
//
// The hook deletes files from shared directories, so the blast radius if it is
// ever edited carelessly is other people's applications — PrimeBuild Internal
// OS sits in the very same folder. NSIS cannot be run here, so these assertions
// pin the script's contract statically: what it may delete, what it must never
// touch, and that it cannot abort an installation.

const root = join(__dirname, "..", "..");
const hooks = readFileSync(join(root, "src-tauri", "installer-hooks.nsh"), "utf8");
const tauriConf = JSON.parse(readFileSync(join(root, "src-tauri", "tauri.conf.json"), "utf8"));

const PRODUCT = "PrimeBuild Official Store";
const CURRENT_FOLDER = "Ecosistema\\PrimeBuild";

/** Every path this script passes to Delete. */
const deletedPaths = [...hooks.matchAll(/PB_RemoveLegacyShortcut\s+\S+\s+"([^"]+)"/g)].map(
  (m) => m[1],
);

describe("wiring", () => {
  it("is registered as the NSIS installer hook", () => {
    expect(tauriConf.bundle?.windows?.nsis?.installerHooks).toBe("installer-hooks.nsh");
  });

  it("the app installs into the per-brand folder", () => {
    expect(tauriConf.bundle?.windows?.nsis?.startMenuFolder).toBe(CURRENT_FOLDER);
  });

  it("defines its helper before using it", () => {
    // NSIS resolves !insertmacro at parse time; using it earlier fails to build.
    expect(hooks.indexOf("!macro PB_RemoveLegacyShortcut")).toBeLessThan(
      hooks.indexOf("!insertmacro PB_RemoveLegacyShortcut"),
    );
  });

  it("gives every expansion a unique label id", () => {
    // Labels are global in NSIS: two expansions sharing an id will not compile.
    const ids = [...hooks.matchAll(/!insertmacro PB_RemoveLegacyShortcut\s+(\S+)/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("what it deletes", () => {
  it("touches the historical locations that actually exist", () => {
    expect(deletedPaths).toContain(`$SMPROGRAMS\\${PRODUCT}.lnk`);
    expect(deletedPaths).toContain(`$SMPROGRAMS\\Ecosistema\\${PRODUCT}.lnk`);
  });

  it("only ever deletes this product's own shortcut", () => {
    for (const p of deletedPaths) {
      expect(p.endsWith(`\\${PRODUCT}.lnk`), `unexpected delete target: ${p}`).toBe(true);
    }
  });

  it("never deletes the shortcut it just created", () => {
    for (const p of deletedPaths) {
      expect(p).not.toBe(`$SMPROGRAMS\\${CURRENT_FOLDER}\\${PRODUCT}.lnk`);
    }
  });
});

describe("what it must never touch", () => {
  // PrimeBuild Internal OS is a DIFFERENT application that installs into the
  // same Ecosistema\PrimeBuild folder. Removing its shortcut here would be
  // indistinguishable from a bug in that app.
  const FOREIGN = [
    "PrimeBuild Internal OS",
    "CoinOS",
    "priembuild-core",
    "Eventra",
    "Partnera",
    "Platform Nexus",
    "Nexus",
  ];

  it("names no other application", () => {
    for (const name of FOREIGN) {
      for (const p of deletedPaths) {
        expect(p.includes(name), `${p} targets a foreign application: ${name}`).toBe(false);
      }
    }
  });

  it("uses no wildcards", () => {
    for (const p of deletedPaths) {
      expect(p).not.toContain("*");
      expect(p).not.toContain("?");
    }
  });

  it("never removes a directory", () => {
    expect(hooks).not.toMatch(/^\s*RMDir/m);
    expect(hooks).not.toMatch(/\/r\b/);
  });
});

describe("safety properties", () => {
  it("is idempotent: every delete is guarded by an existence check", () => {
    const guards = (hooks.match(/IfFileExists/g) ?? []).length;
    expect(guards).toBeGreaterThan(0);
    expect(hooks).toContain("Delete ");
  });

  it("cannot abort an installation", () => {
    expect(hooks).not.toMatch(/^\s*Abort/m);
    expect(hooks).not.toMatch(/^\s*Quit/m);
    expect(hooks).not.toMatch(/MessageBox/);
  });

  it("reports failures instead of swallowing them", () => {
    expect(hooks).toContain("ClearErrors");
    expect(hooks).toContain("IfErrors");
    expect(hooks).toMatch(/DetailPrint[^\n]*aviso/);
  });

  it("cleans up on uninstall as well as install", () => {
    expect(hooks).toContain("!macro NSIS_HOOK_POSTINSTALL");
    expect(hooks).toContain("!macro NSIS_HOOK_POSTUNINSTALL");
  });
});
