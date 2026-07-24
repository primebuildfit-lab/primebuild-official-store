/**
 * ShopifyCatalogMirror — espejo del catálogo Shopify para la Official Store
 * (PBOS-DPB-MEGA-FABLE-001 §7, §9, §16-§18, §53).
 *
 * Shopify sigue siendo la tienda de DROPSHIPPING; este espejo solo copia lo
 * autorizado (título, descripción, medios, taxonomía, SEO, tags, colecciones,
 * opciones, variantes, plantillas, estructura de página, metadata permitida).
 * El stock del proveedor se guarda EXCLUSIVAMENTE como observación
 * (`observedSupplierStock`) y jamás se convierte en stock propio sin una
 * recepción explícita. Nada se borra en Shopify desde aquí.
 */

export const CATALOG_MIRROR_SCHEMA_VERSION = 1;

/* ───────────────────── Modos de sincronización §9 ───────────────────── */

export type MirrorMode =
  | "TEMPLATE_ONLY"
  | "CATALOG_METADATA"
  | "MEDIA"
  | "VARIANT_MAPPING"
  | "OBSERVED_SUPPLIER_STOCK";

export const MIRROR_MODE_LABEL: Record<MirrorMode, string> = {
  TEMPLATE_ONLY: "Solo plantilla",
  CATALOG_METADATA: "Metadata de catálogo",
  MEDIA: "Medios",
  VARIANT_MAPPING: "Mapeo de variantes",
  OBSERVED_SUPPLIER_STOCK: "Stock del proveedor (observado)",
};

/* ───────────────────── Registro del espejo ───────────────────── */

export interface MirrorVariant {
  shopifyVariantId: string;
  title: string;
  sku?: string;
  priceUsd?: string;
  options?: Record<string, string>;
  /** SIEMPRE observación del proveedor; nunca stock propio. */
  observedSupplierStock?: number;
}

export interface ShopifyCatalogMirrorRecord {
  /** id local del registro espejo. */
  id: string;
  shopifyProductId: string;
  handle: string;
  title: string;
  descriptionHtml?: string;
  vendor?: string;
  productType?: string;
  tags: string[];
  collections: string[];
  mediaUrls: string[];
  seo?: { title?: string; description?: string };
  options: { name: string; values: string[] }[];
  variants: MirrorVariant[];
  status: "ACTIVE" | "DRAFT" | "ARCHIVED" | "UNKNOWN";
  /** Fuente y momento de la observación — obligatorios (§11, §70). */
  source: "shopify_admin_api" | "manual_import";
  fetchedAt: string;
  modes: MirrorMode[];
  version: number;
}

export function isMirrorRecord(x: unknown): x is ShopifyCatalogMirrorRecord {
  if (x === null || typeof x !== "object") return false;
  const m = x as Record<string, unknown>;
  return (
    typeof m.id === "string" &&
    typeof m.shopifyProductId === "string" &&
    typeof m.title === "string" &&
    Array.isArray(m.variants) &&
    typeof m.fetchedAt === "string" &&
    (m.source === "shopify_admin_api" || m.source === "manual_import")
  );
}

/* ───────────────────── Propiedad por campo §18 ───────────────────── */

export type FieldOwnership = "SHOPIFY_WINS" | "OFFICIAL_STORE_WINS" | "MANUAL_REVIEW" | "INDEPENDENT";

export interface FieldOwnershipRule {
  field: string;
  ownership: FieldOwnership;
  note: string;
}

/** Matriz inicial de la orden (§18) — configurable, nunca bidireccional genérico. */
export const DEFAULT_FIELD_OWNERSHIP: FieldOwnershipRule[] = [
  { field: "title", ownership: "SHOPIFY_WINS", note: "Título: Shopify gana inicialmente." },
  { field: "descriptionHtml", ownership: "SHOPIFY_WINS", note: "Descripción: Shopify gana inicialmente." },
  { field: "media", ownership: "SHOPIFY_WINS", note: "Medios: Shopify gana inicialmente." },
  { field: "ownedStock", ownership: "OFFICIAL_STORE_WINS", note: "Stock propio: SOLO Official Store." },
  { field: "pbPrice", ownership: "OFFICIAL_STORE_WINS", note: "Precio PB: SOLO Official Store." },
  { field: "dropshippingStatus", ownership: "SHOPIFY_WINS", note: "Estado dropshipping: Shopify gana." },
  { field: "fastShipping", ownership: "OFFICIAL_STORE_WINS", note: "Envío rápido: solo Official Store." },
  { field: "tags", ownership: "MANUAL_REVIEW", note: "Etiquetas: revisión manual." },
  { field: "collections", ownership: "MANUAL_REVIEW", note: "Colecciones: revisión manual." },
  { field: "seo", ownership: "INDEPENDENT", note: "SEO: cada tienda el suyo." },
];

export function ownershipFor(field: string, rules: FieldOwnershipRule[] = DEFAULT_FIELD_OWNERSHIP): FieldOwnership {
  return rules.find((r) => r.field === field)?.ownership ?? "MANUAL_REVIEW";
}

/* ───────────────────── Conflictos §53 ───────────────────── */

export interface SyncConflict {
  id: string;
  shopifyProductId: string;
  field: string;
  shopifyValue: string;
  officialValue: string;
  ownership: FieldOwnership;
  detectedAt: string;
  resolution?: "APPLIED_SHOPIFY" | "KEPT_OFFICIAL" | "MANUAL";
  resolvedAt?: string;
  resolvedBy?: string;
}

/**
 * Detecta divergencias campo a campo entre el espejo y el producto oficial.
 * Los campos SHOPIFY_WINS pueden aplicarse automáticamente (con vista previa);
 * MANUAL_REVIEW siempre queda en conflicto hasta que alguien decida. Nada se
 * resuelve en silencio.
 */
export function detectConflicts(
  mirror: Pick<ShopifyCatalogMirrorRecord, "shopifyProductId" | "title" | "descriptionHtml" | "tags">,
  official: { title: string; descriptionHtml?: string; tags: string[] },
  rules: FieldOwnershipRule[] = DEFAULT_FIELD_OWNERSHIP,
  nowIso: string = new Date().toISOString(),
  makeId: () => string = () => `conf_${Math.random().toString(36).slice(2)}`,
): SyncConflict[] {
  const out: SyncConflict[] = [];
  const push = (field: string, shopifyValue: string, officialValue: string) => {
    if (shopifyValue === officialValue) return;
    out.push({
      id: makeId(),
      shopifyProductId: mirror.shopifyProductId,
      field,
      shopifyValue,
      officialValue,
      ownership: ownershipFor(field, rules),
      detectedAt: nowIso,
    });
  };
  push("title", mirror.title, official.title);
  push("descriptionHtml", mirror.descriptionHtml ?? "", official.descriptionHtml ?? "");
  push("tags", [...mirror.tags].sort().join(","), [...official.tags].sort().join(","));
  return out;
}

/* ───────────────────── Plantillas versionadas §16-§17 ───────────────────── */

export type TemplateState =
  | "Draft"
  | "In review"
  | "Approved"
  | "Published"
  | "Superseded"
  | "Archived";

export interface TemplateSnapshot {
  id: string;
  /** Tipo de plantilla copiada (home, catalog, collection, product, cart, …). */
  templateKind:
    | "home"
    | "catalog"
    | "collection"
    | "product"
    | "cart"
    | "search"
    | "account"
    | "policies"
    | "faq"
    | "contact"
    | "order-status";
  name: string;
  /** Estructura propia (secciones/bloques) — convertida a componentes propios,
   *  sin depender del theme runtime de Shopify. */
  structure: unknown;
  sourceShopifyTemplate?: string;
  state: TemplateState;
  versionNumber: number;
  createdAt: string;
  publishedAt?: string;
  supersededBy?: string;
}

const TEMPLATE_TRANSITIONS: Record<TemplateState, TemplateState[]> = {
  Draft: ["In review", "Archived"],
  "In review": ["Approved", "Draft", "Archived"],
  Approved: ["Published", "Archived"],
  Published: ["Superseded", "Archived"],
  Superseded: ["Archived"],
  Archived: [],
};

/** Transición legal de plantilla; publicar una nueva NUNCA sobrescribe la publicada. */
export function transitionTemplate(
  t: TemplateSnapshot,
  to: TemplateState,
  nowIso: string,
): TemplateSnapshot | null {
  if (!TEMPLATE_TRANSITIONS[t.state].includes(to)) return null;
  return {
    ...t,
    state: to,
    publishedAt: to === "Published" ? nowIso : t.publishedAt,
  };
}

/**
 * Publica una versión Approved: la anterior Published pasa a Superseded (con
 * puntero) y la nueva queda Published. Devuelve la lista completa actualizada
 * o null si la candidata no está Approved.
 */
export function publishTemplateVersion(
  templates: TemplateSnapshot[],
  candidateId: string,
  nowIso: string,
): TemplateSnapshot[] | null {
  const candidate = templates.find((t) => t.id === candidateId);
  if (!candidate || candidate.state !== "Approved") return null;
  return templates.map((t) => {
    if (t.id === candidateId) return { ...t, state: "Published" as TemplateState, publishedAt: nowIso };
    if (t.templateKind === candidate.templateKind && t.state === "Published") {
      return { ...t, state: "Superseded" as TemplateState, supersededBy: candidateId };
    }
    return t;
  });
}

/* ───────────────────── Invariante de stock del proveedor §9/§86 ───────────────────── */

/**
 * El stock del proveedor observado NUNCA puede contabilizarse como propio.
 * Este guard existe para que ninguna superficie lo intente: la única vía de
 * entrada al inventario propio es una recepción explícita en el ledger.
 */
export function supplierStockCanBecomeOwned(): false {
  return false;
}

/* ───────────────────── Métricas del espejo §70 ───────────────────── */

export interface MirrorMetrics {
  productsDiscovered: number;
  templatesCopied: number;
  variantsMapped: number;
  conflictsOpen: number;
  lastSyncAt: string | null;
  staleRecords: number;
}

export function mirrorMetrics(
  records: ShopifyCatalogMirrorRecord[],
  templates: TemplateSnapshot[],
  conflicts: SyncConflict[],
  nowIso: string,
  staleAfterHours = 24,
): MirrorMetrics {
  const lastSyncAt =
    records.length === 0
      ? null
      : records.reduce((acc, r) => (r.fetchedAt > acc ? r.fetchedAt : acc), records[0]!.fetchedAt);
  const staleCutoff = Date.parse(nowIso) - staleAfterHours * 3600_000;
  return {
    productsDiscovered: records.length,
    templatesCopied: templates.length,
    variantsMapped: records.reduce((acc, r) => acc + r.variants.length, 0),
    conflictsOpen: conflicts.filter((c) => !c.resolution).length,
    lastSyncAt,
    staleRecords: records.filter((r) => Date.parse(r.fetchedAt) < staleCutoff).length,
  };
}
