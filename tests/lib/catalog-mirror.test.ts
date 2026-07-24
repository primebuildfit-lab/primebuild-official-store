import { describe, expect, it } from "vitest";
import {
  DEFAULT_FIELD_OWNERSHIP,
  detectConflicts,
  mirrorMetrics,
  ownershipFor,
  publishTemplateVersion,
  supplierStockCanBecomeOwned,
  transitionTemplate,
  type ShopifyCatalogMirrorRecord,
  type TemplateSnapshot,
} from "@/lib/catalog-mirror";
import { importProductFromMirror, usefulVariants, variantStockKey } from "@/lib/official-products";

const NOW = "2026-07-23T12:00:00.000Z";
let seq = 0;
const makeId = () => `id_${++seq}`;

function mirror(partial: Partial<ShopifyCatalogMirrorRecord> = {}): ShopifyCatalogMirrorRecord {
  return {
    id: makeId(),
    shopifyProductId: "gid://shopify/Product/1",
    handle: "primebuild-belt",
    title: "PrimeBuild™ Belt",
    descriptionHtml: "<p>Belt</p>",
    vendor: "PrimeBuild",
    productType: "strength",
    tags: ["strength", "essential"],
    collections: ["strength-training-essentials-1"],
    mediaUrls: ["https://cdn.example/belt.jpg"],
    options: [{ name: "Size", values: ["L", "XL"] }],
    variants: [
      { shopifyVariantId: "v1", title: "Black / L", sku: "SKU-L", priceUsd: "24.99", observedSupplierStock: 10 },
      { shopifyVariantId: "v2", title: "Black / XL", sku: "SKU-XL", priceUsd: "24.99", observedSupplierStock: 10 },
    ],
    status: "ACTIVE",
    source: "shopify_admin_api",
    fetchedAt: NOW,
    modes: ["TEMPLATE_ONLY", "CATALOG_METADATA"],
    version: 1,
    ...partial,
  };
}

function template(partial: Partial<TemplateSnapshot> = {}): TemplateSnapshot {
  return {
    id: makeId(),
    templateKind: "product",
    name: "Plantilla producto",
    structure: { sections: [] },
    state: "Draft",
    versionNumber: 1,
    createdAt: NOW,
    ...partial,
  };
}

describe("propiedad por campo (§18)", () => {
  it("codifica la matriz inicial de la orden", () => {
    expect(ownershipFor("title")).toBe("SHOPIFY_WINS");
    expect(ownershipFor("ownedStock")).toBe("OFFICIAL_STORE_WINS");
    expect(ownershipFor("pbPrice")).toBe("OFFICIAL_STORE_WINS");
    expect(ownershipFor("dropshippingStatus")).toBe("SHOPIFY_WINS");
    expect(ownershipFor("fastShipping")).toBe("OFFICIAL_STORE_WINS");
    expect(ownershipFor("campo-desconocido")).toBe("MANUAL_REVIEW");
    expect(DEFAULT_FIELD_OWNERSHIP.every((r) => r.note.length > 0)).toBe(true);
  });
});

describe("conflictos nunca silenciosos (§53)", () => {
  it("detecta divergencias campo a campo con propiedad anotada", () => {
    const conflicts = detectConflicts(
      mirror(),
      { title: "Otro título", descriptionHtml: "<p>Belt</p>", tags: ["strength", "essential"] },
      DEFAULT_FIELD_OWNERSHIP,
      NOW,
      makeId,
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.field).toBe("title");
    expect(conflicts[0]!.ownership).toBe("SHOPIFY_WINS");
    expect(conflicts[0]!.resolution).toBeUndefined();
  });

  it("sin divergencia no hay conflicto", () => {
    const m = mirror();
    expect(
      detectConflicts(m, { title: m.title, descriptionHtml: m.descriptionHtml, tags: m.tags }, DEFAULT_FIELD_OWNERSHIP, NOW, makeId),
    ).toHaveLength(0);
  });
});

describe("plantillas versionadas (§17)", () => {
  it("recorre Draft → In review → Approved → Published", () => {
    let t = template();
    t = transitionTemplate(t, "In review", NOW)!;
    t = transitionTemplate(t, "Approved", NOW)!;
    t = transitionTemplate(t, "Published", NOW)!;
    expect(t.state).toBe("Published");
    expect(t.publishedAt).toBe(NOW);
  });

  it("prohíbe saltos ilegales", () => {
    expect(transitionTemplate(template(), "Published", NOW)).toBeNull();
    expect(transitionTemplate(template({ state: "Archived" }), "Draft", NOW)).toBeNull();
  });

  it("publicar una versión nueva NUNCA sobrescribe: la anterior queda Superseded", () => {
    const published = template({ state: "Published", versionNumber: 1 });
    const approved = template({ state: "Approved", versionNumber: 2 });
    const out = publishTemplateVersion([published, approved], approved.id, NOW)!;
    const prev = out.find((t) => t.id === published.id)!;
    const next = out.find((t) => t.id === approved.id)!;
    expect(prev.state).toBe("Superseded");
    expect(prev.supersededBy).toBe(approved.id);
    expect(next.state).toBe("Published");
  });

  it("solo se publica desde Approved", () => {
    const draft = template({ state: "Draft" });
    expect(publishTemplateVersion([draft], draft.id, NOW)).toBeNull();
  });
});

describe("import de plantilla de producto (§7, §9, §19)", () => {
  it("copia lo autorizado y el precio Shopify queda como VA con fuente", () => {
    const p = importProductFromMirror(mirror(), NOW, makeId);
    expect(p.title).toBe("PrimeBuild™ Belt");
    expect(p.status).toBe("template");
    expect(p.officialStoreEligible).toBe(false); // decisión explícita del operador
    expect(p.variants).toHaveLength(2);
    expect(p.variants[0]!.vaUsd).toBe("24.99");
    expect(p.variants[0]!.vaSource).toBe("SHOPIFY_CURRENT_PRICE");
    expect(p.variants[0]!.vaObservedAt).toBe(NOW);
  });

  it("el stock del proveedor NO viaja al producto oficial", () => {
    const p = importProductFromMirror(mirror(), NOW, makeId);
    const serialized = JSON.stringify(p);
    expect(serialized.includes("observedSupplierStock")).toBe(false);
    expect(supplierStockCanBecomeOwned()).toBe(false);
  });

  it("variantes útiles: sin duplicados exactos de opciones (§19)", () => {
    const vs = usefulVariants([
      { shopifyVariantId: "a", title: "Black / L", options: { Color: "Black", Size: "L" } },
      { shopifyVariantId: "b", title: "Black / L bis", options: { Size: "L", Color: "Black" } },
      { shopifyVariantId: "c", title: "Black / XL", options: { Color: "Black", Size: "XL" } },
    ]);
    expect(vs).toHaveLength(2);
  });

  it("la clave de stock de la variante prefiere el SKU", () => {
    const p = importProductFromMirror(mirror(), NOW, makeId);
    expect(variantStockKey(p, p.variants[0]!)).toBe("SKU-L");
    const noSku = { ...p.variants[0]!, sku: undefined };
    expect(variantStockKey(p, noSku)).toBe(p.id);
  });
});

describe("métricas del espejo (§70)", () => {
  it("cuenta descubiertos, plantillas, variantes, conflictos y stale", () => {
    const records = [mirror(), mirror({ fetchedAt: "2026-07-20T00:00:00.000Z" })];
    const m = mirrorMetrics(records, [template()], [], NOW, 24);
    expect(m.productsDiscovered).toBe(2);
    expect(m.templatesCopied).toBe(1);
    expect(m.variantsMapped).toBe(4);
    expect(m.conflictsOpen).toBe(0);
    expect(m.staleRecords).toBe(1);
    expect(m.lastSyncAt).toBe(NOW);
  });
});
