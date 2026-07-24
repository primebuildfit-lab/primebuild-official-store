import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Guards the SINGLE SOURCE OF TRUTH for the update channel.
//
// History this test exists to prevent (audit PB-C-001 / M-1, closed for Internal
// OS in PB-FIX-002, closed here in PB-FIX-003): the channel used to be written
// out separately in dist.config.json, in release.mjs AND in the CI workflow.
// Publishing and checking for updates could therefore drift apart silently —
// CI would publish to one place while the installed app polled another.
//
// The same shape as Internal OS's guard, plus workflow coverage: this app is the
// one with a CI pipeline, so it has a third consumer that can diverge.
//
// This test scans EVERY git-tracked file, not a hand-picked list.

const root = join(__dirname, "..", "..");
const readJson = (...p: string[]) => JSON.parse(readFileSync(join(root, ...p), "utf8"));

const channel = readJson("updater-channel.json");
const distConf = readJson("src-tauri", "dist.config.json");
const tauriConf = readJson("src-tauri", "tauri.conf.json");
const workflow = readFileSync(join(root, ".github", "workflows", "desktop-release.yml"), "utf8");

const repoUrl = `https://github.com/${channel.repoOwner}/${channel.repoName}`;
const derivedEndpoint = `${repoUrl}/releases/download/${channel.channelTag}/${channel.manifestName}`;

/** Every git-tracked text file, as [path, contents]. */
function trackedFiles(): Array<[string, string]> {
  const out = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" });
  return out
    .split("\0")
    .filter(Boolean)
    .filter((p) => !/\.(png|ico|icns|jpg|jpeg|gif|webp|woff2?|ttf|zip|exe|sig)$/i.test(p))
    .filter((p) => p !== "pnpm-lock.yaml")
    .map((p) => {
      try {
        return [p, readFileSync(join(root, p), "utf8")] as [string, string];
      } catch {
        return [p, ""] as [string, string];
      }
    });
}

const files = trackedFiles();

/**
 * Files allowed to name the release repository, and why. Anything else that
 * spells it out is a second copy waiting to drift.
 */
const REPO_NAME_ALLOWED = new Map<string, string>([
  ["updater-channel.json", "the canonical definition itself"],
  ["src-tauri/dist.config.json", "derived endpoint, pinned to the canonical value by a test below"],
  ["scripts/desktop/channel.mjs", "derives every URL from the canonical file; contains no literal repo name"],
  ["tests/desktop/updater-channel.test.ts", "this test"],
  [
    "package.json",
    "NAME COLLISION, not a copy: the npm package happens to be called the same as the release repository. Renaming either would be a bigger change than the duplication it removes.",
  ],
  [
    "PRIMEBUILD_OFFICIAL_STORE_UPDATER_REPORT.md",
    "historical record of the shared-repo incident; narrative, not configuration",
  ],
  [
    "PRIMEBUILD_OFFICIAL_STORE_DESKTOP_REPORT.md",
    "historical build report; narrative, not configuration",
  ],
]);

describe("canonical channel definition", () => {
  it("declares everything a publisher and the app both need", () => {
    for (const key of [
      "repoOwner",
      "repoName",
      "channelTag",
      "manifestName",
      "releaseTagPrefix",
      "artifactSuffix",
    ]) {
      expect(channel[key], `updater-channel.json is missing "${key}"`).toBeTruthy();
    }
  });

  it("uses a channel tag that belongs to this app alone", () => {
    // Sharing a tag with another app means one publish silently retargets the
    // other app's updater. PrimeBuild Internal OS owns `internalos-latest`.
    expect(channel.channelTag).not.toBe("internalos-latest");
    expect(channel.channelTag).toContain("store");
  });

  it("keeps the fixed channel tag distinct from per-version release tags", () => {
    // If the moving channel pointer and a version tag ever collided, publishing
    // a version would overwrite the channel manifest with itself.
    expect(channel.channelTag.startsWith(channel.releaseTagPrefix)).toBe(false);
  });

  it("uses a per-app manifest name, never a bare latest.json", () => {
    // A generic name lets a shared repository serve another app's manifest.
    expect(channel.manifestName).not.toBe("latest.json");
    expect(channel.manifestName).toContain("store");
  });
});

describe("the app looks where the pipeline publishes", () => {
  it("dist.config.json carries exactly the derived endpoint", () => {
    expect(distConf.endpoint).toBe(derivedEndpoint);
  });

  it("the endpoint points at the declared channel tag and manifest", () => {
    expect(distConf.endpoint).toContain(`/releases/download/${channel.channelTag}/`);
    expect(distConf.endpoint.endsWith(channel.manifestName)).toBe(true);
  });

  it("the endpoint is HTTPS", () => {
    expect(distConf.endpoint.startsWith("https://")).toBe(true);
  });

  it("tauri.conf.json keeps a placeholder, never a real channel", () => {
    for (const endpoint of tauriConf.plugins?.updater?.endpoints ?? []) {
      expect(endpoint).toContain("OWNER/REPO");
      expect(endpoint).not.toContain(channel.repoName);
    }
  });
});

describe("the CI workflow derives the channel instead of restating it", () => {
  it("loads the canonical definition", () => {
    expect(workflow).toContain("scripts/desktop/channel.mjs --print");
  });

  it("writes neither the repository, the tag nor the manifest by hand", () => {
    const body = workflow
      .split("\n")
      .filter((l) => !l.trimStart().startsWith("#")) // comments are prose
      .join("\n");
    expect(body).not.toContain(channel.repoName);
    expect(body).not.toContain(channel.channelTag);
    expect(body).not.toContain(channel.manifestName);
  });

  it("consumes the exported channel variables", () => {
    expect(workflow).toContain("CHANNEL_MANIFEST");
    expect(workflow).toContain("CHANNEL_TAG");
  });

  it("triggers on the release tag prefix the canonical file declares", () => {
    // GitHub Actions allows no expressions in `on:`, so this one literal cannot
    // be derived. It is validated instead — the whole point being that the tag
    // CI reacts to and the tag the script publishes under cannot diverge.
    const trigger = workflow.match(/tags:\s*\[\s*"([^"]+)"\s*\]/)?.[1];
    expect(trigger, "no push-tag trigger found in the workflow").toBeTruthy();
    expect(trigger).toBe(`${channel.releaseTagPrefix}*`);
  });
});

describe("no second copy of the channel", () => {
  it("only allowlisted files name the release repository", () => {
    const offenders = files
      .filter(([p, body]) => body.includes(channel.repoName) && !REPO_NAME_ALLOWED.has(p))
      .map(([p]) => p);
    expect(
      offenders,
      `these files hardcode "${channel.repoName}" instead of deriving it from updater-channel.json`,
    ).toEqual([]);
  });

  it("the release script derives its URLs instead of writing them", () => {
    const release = files.find(([p]) => p === "scripts/desktop/release.mjs")?.[1] ?? "";
    expect(release.length).toBeGreaterThan(0);
    expect(release).not.toContain("https://github.com/");
    expect(release).toContain("channel.mjs");
  });

  it("channel.mjs holds no literal owner or repo", () => {
    const mod = files.find(([p]) => p === "scripts/desktop/channel.mjs")?.[1] ?? "";
    expect(mod.length).toBeGreaterThan(0);
    expect(mod).not.toContain(channel.repoOwner);
    expect(mod).not.toContain(channel.repoName);
  });

  it("declares no channel other than the canonical one", () => {
    const found = new Set<string>();
    for (const [p, body] of files) {
      if (p === "tests/desktop/updater-channel.test.ts") continue;
      if (REPO_NAME_ALLOWED.get(p)?.startsWith("historical")) continue;
      for (const url of body.match(/https:\/\/github\.com\/[^\s"'`)]+releases\/[^\s"'`)]+/g) ?? []) {
        if (url.includes("OWNER/REPO")) continue; // placeholder sentinel
        if (url.includes("{0}") || url.includes("{1}")) continue; // Actions format() template
        if (url.startsWith(`${repoUrl}/releases/download/${channel.releaseTagPrefix}`)) continue;
        found.add(url.replace(/[.,]$/, ""));
      }
    }
    for (const url of found) {
      expect(url, `undeclared update channel found: ${url}`).toBe(derivedEndpoint);
    }
  });
});

describe("the releases/latest trap", () => {
  it("never reappears as a real URL", () => {
    // GitHub moves the `latest` pointer on every publish, so any release in the
    // repo silently retargets the updater. This app has already been broken by
    // exactly that: it used to publish into a shared repository, another app
    // published after it, and the channel started returning 404. There is no
    // legacy exemption here — unlike Internal OS, this app completed its
    // migration to a fixed tag before PB-FIX-003 began.
    //
    // Matched as a URL, not as a bare substring: several comments name the
    // anti-pattern in order to warn about it, and a guard that punishes its own
    // rationale gets deleted by the next person who trips over it.
    const asUrl = /https?:\/\/[^\s"'`]*releases\/latest\/download/;
    const offenders = files
      .filter(([p]) => !REPO_NAME_ALLOWED.get(p)?.startsWith("historical"))
      .filter(([p]) => p !== "tests/desktop/updater-channel.test.ts")
      .filter(([, body]) => asUrl.test(body))
      .map(([p]) => p);
    expect(offenders, "these files reintroduce the releases/latest channel").toEqual([]);
  });
});
