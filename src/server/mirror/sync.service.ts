import "server-only";
import { createHash } from "node:crypto";
import { shopifyQuery, StoreRequestError } from "@/server/integrations/store/shopify-client";
import { StoreNotConnectedError } from "@/server/integrations/store/config";
import type {
  MirrorCollectionRecord,
  ShopifyCatalogMirrorRecord,
} from "@/lib/catalog-mirror";
import {
  readMirrorStore,
  writeMirrorStore,
  type MirrorFileStore,
  type SyncRunRecord,
} from "./store";

/**
 * Sincronización en vivo del catálogo ACTIVO (PBOS-SCLP-FABLE-002 §11, §17-§19).
 *
 *  - Full sync: pagina todo `status:active` + colecciones.
 *  - Incremental: `updated_at:>since` (los ACTIVE que dejaron de serlo se
 *    detectan en la reconciliación completa, no se borran jamás: quedan
 *    «Removed from source» con historial).
 *  - Idempotente por (updatedAtSource, sourceHash): reejecutar no duplica ni
 *    reordena; retry-safe.
 *  - Sin credenciales: estado honesto «Authentication required» y el último
 *    mirror válido sigue sirviéndose (§31).
 */

const PRODUCT_FIELDS = `
  id handle title status vendor productType tags updatedAt publishedAt
  descriptionHtml
  featuredImage { url }
  seo { title description }
  collections(first: 8) { edges { node { handle } } }
  options { name values }
  variants(first: 50) {
    edges { node {
      id title sku barcode price compareAtPrice inventoryQuantity
      selectedOptions { name value }
      image { url }
    } }
  }
`;

interface GqlProduct {
  id: string;
  handle: string;
  title: string;
  status: string;
  vendor: string | null;
  productType: string | null;
  tags: string[];
  updatedAt: string;
  publishedAt: string | null;
  descriptionHtml: string | null;
  featuredImage: { url: string } | null;
  seo: { title: string | null; description: string | null } | null;
  collections: { edges: Array<{ node: { handle: string } }> };
  options: Array<{ name: string; values: string[] }>;
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        sku: string | null;
        barcode: string | null;
        price: string;
        compareAtPrice: string | null;
        inventoryQuantity: number | null;
        selectedOptions: Array<{ name: string; value: string }>;
        image: { url: string } | null;
      };
    }>;
  };
}

function hashOf(x: unknown): string {
  return createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 16);
}

export function gqlToMirror(node: GqlProduct, nowIso: string): ShopifyCatalogMirrorRecord {
  const rec: ShopifyCatalogMirrorRecord = {
    id: `mirror_${node.id.split("/").pop()}`,
    shopifyProductId: node.id,
    handle: node.handle,
    title: node.title,
    descriptionHtml: node.descriptionHtml ?? undefined,
    vendor: node.vendor ?? undefined,
    productType: node.productType || undefined,
    tags: node.tags ?? [],
    collections: node.collections.edges.map((e) => e.node.handle),
    mediaUrls: [
      ...(node.featuredImage ? [node.featuredImage.url] : []),
      ...node.variants.edges.map((e) => e.node.image?.url).filter((u): u is string => Boolean(u)),
    ].filter((u, i, a) => a.indexOf(u) === i),
    seo:
      node.seo && (node.seo.title || node.seo.description)
        ? { title: node.seo.title ?? undefined, description: node.seo.description ?? undefined }
        : undefined,
    options: node.options,
    variants: node.variants.edges.map(({ node: v }) => ({
      shopifyVariantId: v.id,
      title: v.title,
      sku: v.sku ?? undefined,
      barcode: v.barcode ?? undefined,
      priceUsd: v.price,
      compareAtPriceUsd: v.compareAtPrice && v.compareAtPrice !== "0.00" ? v.compareAtPrice : undefined,
      options: Object.fromEntries(v.selectedOptions.map((o) => [o.name, o.value])),
      imageUrl: v.image?.url ?? undefined,
      observedSupplierStock: v.inventoryQuantity ?? undefined,
    })),
    status: (["ACTIVE", "DRAFT", "ARCHIVED"].includes(node.status)
      ? node.status
      : "UNKNOWN") as ShopifyCatalogMirrorRecord["status"],
    sourceStatus: (["ACTIVE", "DRAFT", "ARCHIVED"].includes(node.status)
      ? node.status
      : "DELETED") as NonNullable<ShopifyCatalogMirrorRecord["sourceStatus"]>,
    publishedAt: node.publishedAt ?? undefined,
    updatedAtSource: node.updatedAt,
    source: "shopify_admin_api",
    fetchedAt: nowIso,
    modes: ["TEMPLATE_ONLY", "CATALOG_METADATA", "MEDIA", "VARIANT_MAPPING", "OBSERVED_SUPPLIER_STOCK"],
    version: 1,
    syncState: "Synced",
  };
  rec.sourceHash = hashOf({
    t: rec.title,
    d: rec.descriptionHtml?.length,
    p: rec.variants.map((v) => [v.priceUsd, v.compareAtPriceUsd]),
    u: rec.updatedAtSource,
    m: rec.mediaUrls,
    c: rec.collections,
  });
  return rec;
}

/** Upsert idempotente: mismo hash ⇒ sin cambios; distinto ⇒ actualiza (§19). */
export function upsertProducts(
  store: MirrorFileStore,
  incoming: ShopifyCatalogMirrorRecord[],
  markMissingAsRetired: boolean,
  nowIso: string,
): { upserted: number; retired: number } {
  const byId = new Map(store.products.map((p) => [p.shopifyProductId, p]));
  let upserted = 0;
  const seen = new Set<string>();
  for (const rec of incoming) {
    seen.add(rec.shopifyProductId);
    const prev = byId.get(rec.shopifyProductId);
    if (prev && prev.sourceHash === rec.sourceHash && prev.sourceStatus === rec.sourceStatus) {
      continue; // idempotente: nada cambió en la fuente
    }
    byId.set(rec.shopifyProductId, { ...rec, id: prev?.id ?? rec.id });
    upserted += 1;
  }
  let retired = 0;
  if (markMissingAsRetired) {
    for (const [id, p] of byId) {
      if (!seen.has(id) && p.sourceStatus === "ACTIVE") {
        // Dejó de estar ACTIVE en la fuente: se retira del público pero el
        // historial, pedidos y auditoría se conservan (§11, §32).
        byId.set(id, {
          ...p,
          sourceStatus: "ARCHIVED",
          removedFromSourceAt: nowIso,
          syncState: "Removed from source",
        });
        retired += 1;
      }
    }
  }
  store.products = [...byId.values()];
  return { upserted, retired };
}

async function fetchAllActive(nowIso: string): Promise<ShopifyCatalogMirrorRecord[]> {
  const out: ShopifyCatalogMirrorRecord[] = [];
  let after: string | null = null;
  for (let page = 0; page < 20; page += 1) {
    const data: {
      products: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        edges: Array<{ node: GqlProduct }>;
      };
    } = await shopifyQuery(
      `query PBMirrorFull($n: Int!, $after: String) {
        products(first: $n, after: $after, query: "status:active") {
          pageInfo { hasNextPage endCursor }
          edges { node { ${PRODUCT_FIELDS} } }
        }
      }`,
      { n: 50, after },
    );
    out.push(...data.products.edges.map((e) => gqlToMirror(e.node, nowIso)));
    if (!data.products.pageInfo.hasNextPage) break;
    after = data.products.pageInfo.endCursor;
  }
  return out;
}

async function fetchCollections(nowIso: string): Promise<MirrorCollectionRecord[]> {
  const data: {
    collections: {
      edges: Array<{
        node: {
          id: string;
          handle: string;
          title: string;
          description: string | null;
          updatedAt: string;
          image: { url: string } | null;
          sortOrder: string;
          ruleSet: { rules: Array<{ column: string; condition: string }> } | null;
          productsCount: { count: number };
        };
      }>;
    };
  } = await shopifyQuery(
    `query PBMirrorCollections {
      collections(first: 100) {
        edges { node {
          id handle title description updatedAt sortOrder
          image { url }
          ruleSet { rules { column condition } }
          productsCount { count }
        } }
      }
    }`,
  );
  return data.collections.edges.map(({ node }) => ({
    id: `mcol_${node.handle}`,
    handle: node.handle,
    title: node.title,
    description: node.description ?? undefined,
    imageUrl: node.image?.url ?? undefined,
    sortOrder: node.sortOrder,
    ruleTag: node.ruleSet?.rules.find((r) => r.column === "TAG")?.condition,
    productsCount: node.productsCount.count,
    updatedAtSource: node.updatedAt,
    source: "shopify_admin_api",
    fetchedAt: nowIso,
  }));
}

export interface SyncResult {
  ok: boolean;
  run: SyncRunRecord;
  state: MirrorFileStore["meta"]["state"];
}

async function runSync(kind: "full" | "incremental" | "reconciliation", sinceIso?: string): Promise<SyncResult> {
  const now = new Date().toISOString();
  const store = readMirrorStore();
  const run: SyncRunRecord = {
    id: `run_${Date.now().toString(36)}`,
    kind,
    startedAt: now,
    ok: false,
    productsSeen: 0,
    productsUpserted: 0,
    productsRetired: 0,
    collectionsSeen: 0,
  };
  try {
    let incoming: ShopifyCatalogMirrorRecord[];
    if (kind === "incremental" && sinceIso) {
      const data: {
        products: { edges: Array<{ node: GqlProduct }> };
      } = await shopifyQuery(
        `query PBMirrorIncr($q: String!) {
          products(first: 100, query: $q) {
            edges { node { ${PRODUCT_FIELDS} } }
          }
        }`,
        { q: `updated_at:>'${sinceIso}'` },
      );
      incoming = data.products.edges.map((e) => gqlToMirror(e.node, now));
    } else {
      incoming = await fetchAllActive(now);
    }
    const collections = await fetchCollections(now);
    const { upserted, retired } = upsertProducts(store, incoming, kind !== "incremental", now);
    store.collections = collections;
    run.productsSeen = incoming.length;
    run.productsUpserted = upserted;
    run.productsRetired = retired;
    run.collectionsSeen = collections.length;
    run.finishedAt = new Date().toISOString();
    run.ok = true;
    store.meta.state = "Synced";
    store.meta.source = "shopify_admin_api";
    store.meta.lastError = undefined;
    if (kind === "incremental") store.meta.lastIncrementalAt = run.finishedAt;
    else store.meta.lastFullSyncAt = run.finishedAt;
    if (kind === "reconciliation") store.meta.lastReconciliationAt = run.finishedAt;
    store.runs = [run, ...store.runs].slice(0, 30);
    writeMirrorStore(store);
    return { ok: true, run, state: store.meta.state };
  } catch (e) {
    run.finishedAt = new Date().toISOString();
    run.error =
      e instanceof StoreNotConnectedError
        ? "Credenciales de Shopify no configuradas"
        : e instanceof StoreRequestError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Error desconocido";
    // El último mirror válido SIGUE sirviéndose; solo cambia el estado (§31).
    store.meta.state =
      e instanceof StoreNotConnectedError ? "Authentication required" : "Source unavailable";
    store.meta.lastError = run.error;
    store.runs = [run, ...store.runs].slice(0, 30);
    writeMirrorStore(store);
    return { ok: false, run, state: store.meta.state };
  }
}

export const fullSync = () => runSync("full");
export const reconcile = () => runSync("reconciliation");
export function incrementalSync(): Promise<SyncResult> {
  const store = readMirrorStore();
  const since =
    store.meta.lastIncrementalAt ?? store.meta.lastFullSyncAt ?? "2020-01-01T00:00:00Z";
  return runSync("incremental", since);
}

/** Importa un snapshot (mismo pipeline idempotente; fuente etiquetada). */
export function importSnapshot(snapshot: {
  capturedAt: string;
  products: ShopifyCatalogMirrorRecord[];
  collections: MirrorCollectionRecord[];
}): SyncResult {
  const now = new Date().toISOString();
  const store = readMirrorStore();
  const products = snapshot.products.map((p) => ({ ...p, source: "snapshot_import" as const }));
  const { upserted, retired } = upsertProducts(store, products, true, now);
  store.collections = snapshot.collections.map((c) => ({ ...c, source: "snapshot_import" as const }));
  const run: SyncRunRecord = {
    id: `run_${Date.now().toString(36)}`,
    kind: "snapshot_import",
    startedAt: now,
    finishedAt: new Date().toISOString(),
    ok: true,
    productsSeen: products.length,
    productsUpserted: upserted,
    productsRetired: retired,
    collectionsSeen: store.collections.length,
  };
  // Un snapshot NUNCA es «Synced»: es una foto etiquetada que queda Stale
  // hasta que exista sincronización real con credenciales.
  store.meta.state = "Stale";
  store.meta.source = `snapshot_import (capturado ${snapshot.capturedAt})`;
  store.runs = [run, ...store.runs].slice(0, 30);
  writeMirrorStore(store);
  return { ok: true, run, state: store.meta.state };
}
