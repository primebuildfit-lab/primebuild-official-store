import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NexusHttpTransport, renderNexusPanel, type RequestFn, type NexusContextResult } from "@platform-nexus/app-surface";
import { PBSTORE_AUDIENCE, FOREIGN_AUDIENCE, PANEL_OPTIONS, resolvePanel, tokenFromCookieHeader, renderNexusPanelUnauthorized } from "@/lib/nexus-surface";

/** ROLLOUT-004 Wave 5 — PrimeBuild Internal OS (shared package, injected transport). */

const ACTIVE: NexusContextResult = {
  active: true,
  identity: { identityId: "u1", displayName: "Store Employee", companyIds: ["primebuild"], roleKeys: [], capabilities: [], employmentStatus: "active" },
  session: { audience: PBSTORE_AUDIENCE, applicationId: PBSTORE_AUDIENCE, assurance: "mfa", expiresAtMs: 1_700_003_600_000, status: "active" },
};

const fake = (map: Record<string, { status: number; body: unknown }>): RequestFn => async (url) => {
  const app = new URL(url).searchParams.get("app") ?? "";
  const spec = map[app] ?? { status: 401, body: { active: false } };
  return { status: spec.status, body: JSON.stringify(spec.body) };
};

describe("PBStore — Nexus surface (employee-only, audience-bound)", () => {
  it("panel: own audience active, foreign rejected, deep link + signed-download policy", async () => {
    const t = new NexusHttpTransport("http://x", fake({ [PBSTORE_AUDIENCE]: { status: 200, body: ACTIVE } }));
    const view = await resolvePanel(t, "tok");
    expect(view?.own.active).toBe(true);
    expect(view?.foreign.active).toBe(false);
    const out = renderNexusPanel(view!, PANEL_OPTIONS);
    expect(out).toContain("Store Employee");
    expect(out).toContain("RECHAZADA (aislamiento correcto)");
    expect(out).toContain(`nexus-studio://app/${PBSTORE_AUDIENCE}`);
    expect(out).toContain("no existe release FIRMADO");
  });

  it("employee-only: no token / revoked ⇒ unauthorized; cookie parser strict", async () => {
    const t = new NexusHttpTransport("http://x", fake({}));
    expect(await resolvePanel(t, undefined)).toBeNull();
    expect((await resolvePanel(t, "revoked"))?.own.active).toBe(false);
    expect(tokenFromCookieHeader("a=1; nexus_session=T%20K; b=2")).toBe("T K");
    expect(tokenFromCookieHeader(null)).toBeUndefined();
    expect(renderNexusPanelUnauthorized(PANEL_OPTIONS)).toContain("solo para empleados");
  });

  it("PROHIBITION guard: the Nexus glue imports no commerce/Shopify module", () => {
    for (const f of ["src/lib/nexus-surface.ts", "src/app/nexus-panel/route.ts"]) {
      const src = readFileSync(resolve(process.cwd(), f), "utf8");
      const specifiers = [...src.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]!);
      expect(specifiers.length).toBeGreaterThan(0);
      for (const s of specifiers) expect(s).not.toMatch(/shopify|catalog|product|order|price|inventory|commerce/i);
      // Only the shared package and local glue may be imported.
      expect(specifiers.every((s) => s === "@platform-nexus/app-surface" || s === "@/lib/nexus-surface")).toBe(true);
    }
  });

  it("foreign audience never validates (cross-app isolation at the contract level)", async () => {
    const t = new NexusHttpTransport("http://x", fake({ [PBSTORE_AUDIENCE]: { status: 200, body: ACTIVE }, [FOREIGN_AUDIENCE]: { status: 401, body: { active: false } } }));
    const view = await resolvePanel(t, "tok");
    expect(view?.foreign.active).toBe(false);
  });
});
