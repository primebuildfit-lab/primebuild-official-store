import { describe, expect, it } from "vitest";
import { FEATURE_FLAGS, flagEnabled } from "@/config/feature-flags";
import { STORE_ROLES, roleCan } from "@/config/store-permissions";
import { sanitizeProductHtml } from "@/lib/official-products";

describe("feature flags (§85)", () => {
  it("define los 8 flags canónicos de la orden", () => {
    const names = FEATURE_FLAGS.map((f) => f.name);
    for (const expected of [
      "primebuildOfficialStoreEnabled",
      "shopifyCatalogMirrorEnabled",
      "ownedInventoryEnabled",
      "pbExchangeV1Enabled",
      "pbExchangeMoneyModeEnabled",
      "pbTransferFeeEnabled",
      "pbStorePricingEnabled",
      "crossAppPbExchangeEnabled",
    ]) {
      expect(names, `falta el flag ${expected}`).toContain(expected);
    }
  });

  it("el modo dinero real PB nace DESHABILITADO con puerta documentada", () => {
    const money = FEATURE_FLAGS.find((f) => f.name === "pbExchangeMoneyModeEnabled")!;
    expect(money.enabled).toBe(false);
    expect(money.gate).toBeTruthy();
    expect(flagEnabled("pbExchangeMoneyModeEnabled")).toBe(false);
    expect(flagEnabled("pbExchangeV1Enabled")).toBe(true);
    expect(flagEnabled("flag-inexistente")).toBe(false);
  });
});

describe("roles de la tienda (§62)", () => {
  it("declara los 11 roles sugeridos por la orden", () => {
    expect(STORE_ROLES).toHaveLength(11);
    expect(STORE_ROLES.map((r) => r.label)).toContain("PrimeBuild Official Store Owner");
    expect(STORE_ROLES.map((r) => r.label)).toContain("PB Pricing Viewer");
  });

  it("las capacidades se resuelven por rol", () => {
    expect(roleCan("owner", "inventory.receive")).toBe(true);
    expect(roleCan("pb-pricing-viewer", "pb-pricing.view")).toBe(true);
    expect(roleCan("pb-pricing-viewer", "inventory.adjust")).toBe(false);
    expect(roleCan("rol-inexistente", "audit.view")).toBe(false);
  });
});

describe("sanitizado de contenido de producto (§81)", () => {
  it("elimina scripts, manejadores y javascript:", () => {
    const dirty =
      '<p onclick="alert(1)">Hola</p><script>alert("x")</script><img src="x" onerror="alert(2)"><a href="javascript:alert(3)">link</a><iframe src="https://evil"></iframe>';
    const clean = sanitizeProductHtml(dirty);
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("onerror");
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("javascript:");
    expect(clean).not.toContain("<iframe");
    expect(clean).toContain("Hola");
  });

  it("conserva el HTML inocuo", () => {
    const ok = "<p>Descripción <strong>fuerte</strong> con <a href=\"https://primebuildfit.com\">enlace</a></p>";
    expect(sanitizeProductHtml(ok)).toBe(ok);
  });
});
