import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PRIMEBUILD_STOREFRONT_TOKENS } from "@/lib/storefront-tokens";
import {
  DEFAULT_VISIBILITY_MODE,
  isPubliclyVisible,
  resolveVisibilityPolicy,
} from "@/config/visibility-policy";
import { cardFromMirror, mirrorProductsInCollection, officialFromMirror } from "@/lib/mirror-card";
import type { ShopifyCatalogMirrorRecord } from "@/lib/catalog-mirror";
import { SYNC_STATES } from "@/lib/catalog-mirror";

const NOW = "2026-07-24T12:00:00.000Z";

function mirror(partial: Partial<ShopifyCatalogMirrorRecord> = {}): ShopifyCatalogMirrorRecord {
  return {
    id: "m1",
    shopifyProductId: "gid://shopify/Product/1",
    handle: "belt",
    title: "Belt",
    tags: ["strength"],
    collections: ["sport"],
    mediaUrls: ["https://cdn/img.jpg"],
    options: [],
    variants: [
      {
        shopifyVariantId: "v1",
        title: "Default",
        sku: "SKU-1",
        priceUsd: "24.99",
        compareAtPriceUsd: "39.99",
        observedSupplierStock: 10,
      },
    ],
    status: "ACTIVE",
    sourceStatus: "ACTIVE",
    source: "shopify_admin_api",
    fetchedAt: NOW,
    modes: ["CATALOG_METADATA"],
    version: 1,
    ...partial,
  };
}

describe("PrimeBuildStorefrontTokens (§8) — paridad con el theme capturado", () => {
  it("colores y fuentes exactos del theme Primebuild 1.1", () => {
    const t = PRIMEBUILD_STOREFRONT_TOKENS;
    expect(t.colors.background).toBe("#0a0a0a");
    expect(t.colors.text).toBe("#f5f5f0");
    expect(t.colors.gold).toBe("#c9a227");
    expect(t.colors.lime).toBe("#c6ff3d");
    expect(t.colors.textBody).toBe("#b8b8b0");
    expect(t.typography.serif).toContain("Georgia");
    expect(t.typography.navSize).toBe("13px");
    expect(t.grid.columnsDesktop).toBe(4);
    expect(t.breakpoints.desktopNav).toBe(989);
    expect(t.source.themeId).toContain("137969598672");
  });

  it("la hoja shopify-clone.css materializa los mismos tokens", () => {
    const css = readFileSync(join(process.cwd(), "src", "styles", "shopify-clone.css"), "utf8");
    for (const v of ["#0a0a0a", "#f5f5f0", "#c9a227", "#c6ff3d", "Georgia", "1600px", "repeat(4, 1fr)"]) {
      expect(css, `falta ${v}`).toContain(v);
    }
  });
});

describe("OfficialStoreProductVisibilityPolicy (§12-§13)", () => {
  it("default obligatorio ACTIVE_AND_OWNED_STOCK", () => {
    expect(DEFAULT_VISIBILITY_MODE).toBe("ACTIVE_AND_OWNED_STOCK");
    expect(resolveVisibilityPolicy({}).mode).toBe("ACTIVE_AND_OWNED_STOCK");
  });

  it("ALL_ACTIVE_PRODUCTS sin confirmación del owner cae al default", () => {
    const p = resolveVisibilityPolicy({ requested: "ALL_ACTIVE_PRODUCTS" });
    expect(p.mode).toBe("ACTIVE_AND_OWNED_STOCK");
    expect(p.requestedMode).toBe("ALL_ACTIVE_PRODUCTS");
    expect(p.ownerConfirmed).toBe(false);
    const confirmed = resolveVisibilityPolicy({ requested: "ALL_ACTIVE_PRODUCTS", ownerConfirmed: "yes" });
    expect(confirmed.mode).toBe("ALL_ACTIVE_PRODUCTS");
  });

  it("visibilidad: ACTIVE+stock ⇒ visible; sin stock ⇒ oculto; DRAFT/ARCHIVED jamás", () => {
    const policy = resolveVisibilityPolicy({});
    expect(isPubliclyVisible({ sourceStatus: "ACTIVE", ownedAvailable: 3, manuallyEnabled: false, policy })).toBe(true);
    expect(isPubliclyVisible({ sourceStatus: "ACTIVE", ownedAvailable: 0, manuallyEnabled: true, policy })).toBe(false);
    for (const s of ["DRAFT", "ARCHIVED", "DELETED", undefined]) {
      const all = resolveVisibilityPolicy({ requested: "ALL_ACTIVE_PRODUCTS", ownerConfirmed: "yes" });
      expect(isPubliclyVisible({ sourceStatus: s, ownedAvailable: 99, manuallyEnabled: true, policy: all })).toBe(false);
    }
  });

  it("ACTIVE_AND_MANUALLY_ENABLED respeta el interruptor del operador", () => {
    const policy = resolveVisibilityPolicy({ requested: "ACTIVE_AND_MANUALLY_ENABLED", ownerConfirmed: "yes" });
    expect(isPubliclyVisible({ sourceStatus: "ACTIVE", ownedAvailable: 0, manuallyEnabled: true, policy })).toBe(true);
    expect(isPubliclyVisible({ sourceStatus: "ACTIVE", ownedAvailable: 0, manuallyEnabled: false, policy })).toBe(false);
  });
});

describe("adaptadores del espejo (§23-§24)", () => {
  it("tarjeta: PB primario desde VA observado, 10% una vez, compare-at tachado", () => {
    const c = cardFromMirror(mirror(), 5, NOW);
    expect(c.vnUsd).toBe("22.49"); // 24.99 × 0.9
    expect(c.compareAtUsd).toBe("39.99"); // compare-at observado gana al VA
    expect(c.pbDisplay).toBeTruthy();
    expect(c.badge).toBe("Sale");
    expect(c.href).toBe("/shop/products/belt");
  });

  it("sin compare-at, el tachado es el VA de referencia (nunca un precio falso)", () => {
    const rec = mirror();
    rec.variants[0]!.compareAtPriceUsd = undefined;
    const c = cardFromMirror(rec, 5, NOW);
    expect(c.compareAtUsd).toBe("24.99");
    expect(c.badge).toBeUndefined();
  });

  it("officialFromMirror nunca copia el supplier stock", () => {
    const p = officialFromMirror(mirror());
    expect(JSON.stringify(p)).not.toContain("observedSupplierStock");
  });

  it("pertenencia a colección por relación observada o tag de regla", () => {
    const a = mirror({ id: "a", handle: "a", collections: ["sport"], tags: [] });
    const b = mirror({ id: "b", handle: "b", collections: [], tags: ["Run"] });
    expect(mirrorProductsInCollection([a, b], "sport")).toHaveLength(1);
    expect(mirrorProductsInCollection([a, b], "running", "Run")).toHaveLength(1);
  });
});

describe("estados de sincronización (§21)", () => {
  it("expone los 9 estados exactos de la orden", () => {
    expect(SYNC_STATES).toEqual([
      "Synced",
      "Pending",
      "Partial",
      "Stale",
      "Conflict",
      "Source unavailable",
      "Authentication required",
      "Failed",
      "Removed from source",
    ]);
  });
});
