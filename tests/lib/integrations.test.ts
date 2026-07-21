import { describe, it, expect } from "vitest";
import { buildIntegrations, integrationStateLabel } from "@/lib/integrations";

describe("integrations registry (PBOS ORDEN 25)", () => {
  it("derives Shopify state from evidence, not env presence", () => {
    const off = buildIntegrations(false).find((i) => i.id === "shopify")!;
    const on = buildIntegrations(true).find((i) => i.id === "shopify")!;
    expect(off.state).toBe("no-conectada");
    expect(on.state).toBe("conectada-sin-verificar"); // connected but not "verified" without more evidence
  });

  it("never exposes a secret value", () => {
    for (const i of buildIntegrations(true)) {
      expect(i.credentialRef).not.toMatch(/shpat_|secret|password|token=/i);
    }
  });

  it("links Nexus/CoinOS/EAL as responsible systems instead of duplicating them", () => {
    const all = buildIntegrations(false);
    expect(all.find((i) => i.id === "nexus")!.owner).toBe("Platform Nexus");
    expect(all.find((i) => i.id === "coinos")!.owner).toBe("CoinOS");
    const eal = all.find((i) => i.id === "eal")!;
    expect(eal.owner).toBe("EAL-001");
    expect(eal.link?.kind).toBe("pendiente");
  });

  it("keeps Analytics pending", () => {
    expect(buildIntegrations(false).find((i) => i.id === "analytics")!.state).toBe(
      "pendiente-decision",
    );
    expect(integrationStateLabel("no-conectada")).toMatch(/No conectada/);
  });
});
