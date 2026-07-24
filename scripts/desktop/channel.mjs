// PrimeBuild Official Store — derived view of the canonical update channel.
//
// `updater-channel.json` at the repo root is the ONLY place the owner, repo,
// tag and manifest name are written down. Everything else asks this module:
// the release script, the CI workflow (via `--print`), and the guard tests.
//
// Before PB-FIX-003 the channel was spelled out separately in dist.config.json,
// in release.mjs and in the workflow, so publishing and checking for updates
// could drift apart silently — the app would look in one place while CI
// published to another. Import from here instead of writing a URL by hand.
//
// This mirrors the module of the same name in PrimeBuild Internal OS on
// purpose: one pattern, two sets of data. The two apps share no channel, no
// tag and no repository, so they share no file either — each owns its own.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const channelConfigPath = join(here, "..", "..", "updater-channel.json");

/** The canonical channel definition, exactly as committed. */
export const channel = JSON.parse(readFileSync(channelConfigPath, "utf8"));

const repoUrl = `https://github.com/${channel.repoOwner}/${channel.repoName}`;

/** `owner/repo`, as GitHub Actions and the gh CLI expect it. */
export const repoSlug = `${channel.repoOwner}/${channel.repoName}`;

/**
 * Where the installed app looks for updates: a FIXED tag, never
 * `releases/latest/download`. GitHub moves the `latest` pointer whenever any
 * release is published, so a shared or reordered release silently 404s the
 * channel. That is not hypothetical here — it is the incident that forced this
 * app off the shared primebuild-saas repository (see docs/RELEASE_SETUP.md).
 */
export const updaterEndpoint = `${repoUrl}/releases/download/${channel.channelTag}/${channel.manifestName}`;

/** The git tag a given version is published under. */
export const releaseTag = (version) => `${channel.releaseTagPrefix}${version}`;

/** Where the artifacts of a given version are downloaded from. */
export const downloadBase = (version) => `${repoUrl}/releases/download/${releaseTag(version)}`;

// `node scripts/desktop/channel.mjs --print` emits KEY=value lines so shell and
// CI steps can consume the same source of truth without parsing JSON by hand.
if (process.argv.includes("--print")) {
  const out = {
    CHANNEL_REPO: repoSlug,
    CHANNEL_TAG: channel.channelTag,
    CHANNEL_MANIFEST: channel.manifestName,
    CHANNEL_TAG_PREFIX: channel.releaseTagPrefix,
    CHANNEL_ENDPOINT: updaterEndpoint,
  };
  for (const [k, v] of Object.entries(out)) console.log(`${k}=${v}`);
}
