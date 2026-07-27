import { describe, expect, it } from "vitest";
import { upsertProducts } from "@/server/mirror/sync.service";
import type { MirrorFileStore } from "@/server/mirror/store";
import type { ShopifyCatalogMirrorRecord } from "@/lib/catalog-mirror";

const NOW = "2026-07-24T12:00:00.000Z";

function rec(id: string, hash: string, status: "ACTIVE" | "ARCHIVED" = "ACTIVE"): ShopifyCatalogMirrorRecord {
  return {
    id: `mirror_${id}`,
    shopifyProductId: `gid://shopify/Product/${id}`,
    handle: `p-${id}`,
    title: `P${id}`,
    tags: [],
    collections: [],
    mediaUrls: [],
    options: [],
    variants: [],
    status,
    sourceStatus: status,
    sourceHash: hash,
    source: "shopify_admin_api",
    fetchedAt: NOW,
    modes: ["CATALOG_METADATA"],
    version: 1,
    syncState: "Synced",
  };
}

function store(products: ShopifyCatalogMirrorRecord[] = []): MirrorFileStore {
  return {
    v: 1,
    updatedAt: NOW,
    meta: { state: "Synced" },
    products,
    collections: [],
    runs: [],
  };
}

describe("upsert del mirror (§11, §19): idempotente, versionado, retry-safe", () => {
  it("mismo hash ⇒ 0 cambios (reejecutar no duplica)", () => {
    const s = store([rec("1", "aaa")]);
    const r = upsertProducts(s, [rec("1", "aaa")], true, NOW);
    expect(r.upserted).toBe(0);
    expect(s.products).toHaveLength(1);
  });

  it("hash distinto ⇒ actualiza sin duplicar", () => {
    const s = store([rec("1", "aaa")]);
    const r = upsertProducts(s, [rec("1", "bbb")], true, NOW);
    expect(r.upserted).toBe(1);
    expect(s.products).toHaveLength(1);
    expect(s.products[0]!.sourceHash).toBe("bbb");
  });

  it("ACTIVE ausente en un full sync ⇒ retirado con historial, jamás borrado (§11, §32)", () => {
    const s = store([rec("1", "aaa"), rec("2", "ccc")]);
    const r = upsertProducts(s, [rec("1", "aaa")], true, NOW);
    expect(r.retired).toBe(1);
    expect(s.products).toHaveLength(2); // nada se borra
    const retired = s.products.find((p) => p.shopifyProductId.endsWith("/2"))!;
    expect(retired.sourceStatus).toBe("ARCHIVED");
    expect(retired.syncState).toBe("Removed from source");
    expect(retired.removedFromSourceAt).toBe(NOW);
  });

  it("un sync incremental NO retira ausentes (solo la reconciliación completa)", () => {
    const s = store([rec("1", "aaa"), rec("2", "ccc")]);
    const r = upsertProducts(s, [rec("1", "zzz")], false, NOW);
    expect(r.retired).toBe(0);
    expect(s.products.find((p) => p.shopifyProductId.endsWith("/2"))!.sourceStatus).toBe("ACTIVE");
  });
});
