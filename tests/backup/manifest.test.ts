import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The pre-redesign backup is the ONLY copy of this app's code from before the
// redesign: the first commit of this repository is already the redesign
// (PB-C-001 / M-5). The backup itself must never be committed — it is 196 MB
// and lives outside the tree — so this manifest is how its integrity can be
// checked without it. These assertions keep the manifest trustworthy.

const root = join(__dirname, "..", "..");
const manifest = JSON.parse(
  readFileSync(join(root, "docs", "backup", "PRE_REDESIGN_BACKUP_MANIFEST.json"), "utf8"),
);

describe("manifest integrity", () => {
  it("counts what it lists", () => {
    expect(manifest.files.length).toBe(manifest.contents.sourceFileCount);
  });

  it("sizes add up to the recorded total", () => {
    const sum = manifest.files.reduce((s: number, f: { bytes: number }) => s + f.bytes, 0);
    expect(sum).toBe(manifest.contents.sourceBytes);
  });

  it("gives every file a full sha256", () => {
    for (const f of manifest.files) {
      expect(f.sha256, `${f.path} has no usable hash`).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it("lists no path twice", () => {
    const paths = manifest.files.map((f: { path: string }) => f.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe("the archive is verified, not merely created", () => {
  it("records a hash and the date it was checked", () => {
    expect(manifest.archive.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.archive.bytes).toBeGreaterThan(0);
    expect(manifest.archive.verifiedOn).toBeTruthy();
    expect(manifest.archive.verification).toMatch(/recompared|matched/i);
  });

  it("justifies everything it left out", () => {
    for (const e of manifest.excludedFromArchive) {
      expect(e.sha256, `${e.path} was excluded without recording its hash`).toMatch(/^[a-f0-9]{64}$/);
      expect(e.reason).toBeTruthy();
    }
    for (const e of manifest.excludedFromManifest) {
      expect(e.reason).toBeTruthy();
    }
  });
});

describe("deletion stays gated", () => {
  it("keeps every condition required before this may be deleted", () => {
    const conditions: string[] = manifest.deletionConditions.conditions;
    expect(conditions.length).toBeGreaterThanOrEqual(5);
    // The one that is not satisfied today: there is no copy off this machine.
    expect(conditions.join(" ")).toMatch(/external copy/i);
    expect(conditions.join(" ")).toMatch(/owner has authorised/i);
  });

  it("still classifies the backup as a single copy to keep", () => {
    expect(manifest.classification).toMatch(/CONSERVAR/);
  });
});

describe("the backup itself is not in the repository", () => {
  it("points at a path outside the tree", () => {
    // Committing 196 MB of superseded build output would be the wrong fix.
    expect(manifest.archive.path).not.toContain("/PrimeBuildOfficialStore/");
    expect(manifest.origin.backupPath).not.toMatch(/PrimeBuildOfficialStore\//);
  });

  it("carries no secret material", () => {
    const blob = JSON.stringify(manifest);
    expect(blob).not.toMatch(/PRIVATE KEY/i);
    expect(blob).not.toMatch(/shpat_/);
    expect(blob).not.toMatch(/untrusted comment: minisign encrypted secret key/i);
  });
});
