/**
 * PrimeBuildOfficialProduct — catálogo propio de la Official Store
 * (PBOS-DPB-MEGA-FABLE-001 §6-§7, §19, §72).
 *
 * Un producto oficial nace normalmente importando una PLANTILLA del espejo
 * Shopify (título/medios/estructura autorizada) o de forma manual. Existir
 * como plantilla no implica estar publicado: la visibilidad pública la decide
 * exclusivamente la regla de inventario (§10) — available > 0 + elegibilidad +
 * OWNED_STOCK. El stock del proveedor jamás se copia como stock propio.
 */

import type { MirrorVariant, ShopifyCatalogMirrorRecord } from "./catalog-mirror";
import type { VaSource } from "./pb-exchange/pb-exchange-sdk";

export const OFFICIAL_PRODUCTS_SCHEMA_VERSION = 1;

export interface OfficialVariant {
  id: string;
  title: string;
  sku?: string;
  options?: Record<string, string>;
  /** VA — valor de referencia USD con fuente y momento declarados (§40). */
  vaUsd?: string;
  vaSource?: VaSource;
  vaObservedAt?: string;
  /** Mapeo al variante Shopify de origen, si procede. */
  shopifyVariantId?: string;
}

export type OfficialProductStatus = "template" | "ready" | "retired";

export interface PrimeBuildOfficialProduct {
  id: string;
  title: string;
  descriptionHtml?: string;
  handle: string;
  vendor: string;
  productType?: string;
  tags: string[];
  collections: string[];
  mediaUrls: string[];
  seo?: { title?: string; description?: string };
  options: { name: string; values: string[] }[];
  variants: OfficialVariant[];
  /** template = copiado, sin stock; ready = operable; retired = fuera de uso. */
  status: OfficialProductStatus;
  /** Elegibilidad para el storefront (además del stock). */
  officialStoreEligible: boolean;
  /** Configuración de envío rápido (§14) — solo verdad verificable. */
  fastShipping: {
    warehouseAssigned: boolean;
    carrierServiceAvailable: boolean;
    cutoffDefined: boolean;
    slaRegistered: boolean;
  };
  source:
    | { type: "shopify_mirror"; shopifyProductId: string; mirrorId: string; importedAt: string }
    | { type: "manual"; createdAt: string };
  createdAt: string;
  updatedAt: string;
  version: number;
}

export function isOfficialProduct(x: unknown): x is PrimeBuildOfficialProduct {
  if (x === null || typeof x !== "object") return false;
  const p = x as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    typeof p.title === "string" &&
    Array.isArray(p.variants) &&
    typeof p.officialStoreEligible === "boolean" &&
    (p.status === "template" || p.status === "ready" || p.status === "retired")
  );
}

/**
 * Reglas PrimeBuild de variantes (§19): variantes útiles, sin duplicados
 * exactos de opciones, y jamás con stock inventado (el stock vive en el
 * ledger, no aquí).
 */
export function usefulVariants(variants: MirrorVariant[]): MirrorVariant[] {
  const seen = new Set<string>();
  return variants.filter((v) => {
    const sig = v.options
      ? Object.entries(v.options)
          .map(([k, val]) => `${k}=${val}`)
          .sort()
          .join("|")
      : v.title;
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });
}

/**
 * Importa una plantilla de producto desde el espejo (§7, §16). Copia SOLO lo
 * autorizado; el precio Shopify queda como VA (fuente SHOPIFY_CURRENT_PRICE,
 * con timestamp del espejo); el stock del proveedor NO viaja — nace sin stock
 * propio y por tanto oculto del storefront hasta que exista una recepción.
 */
export function importProductFromMirror(
  mirror: ShopifyCatalogMirrorRecord,
  nowIso: string,
  makeId: () => string,
): PrimeBuildOfficialProduct {
  return {
    id: makeId(),
    title: mirror.title,
    descriptionHtml: mirror.descriptionHtml,
    handle: mirror.handle,
    vendor: mirror.vendor ?? "PrimeBuild",
    productType: mirror.productType,
    tags: [...mirror.tags],
    collections: [...mirror.collections],
    mediaUrls: [...mirror.mediaUrls],
    seo: mirror.seo ? { ...mirror.seo } : undefined,
    options: mirror.options.map((o) => ({ name: o.name, values: [...o.values] })),
    variants: usefulVariants(mirror.variants).map((v) => ({
      id: makeId(),
      title: v.title,
      sku: v.sku,
      options: v.options ? { ...v.options } : undefined,
      vaUsd: v.priceUsd,
      vaSource: v.priceUsd ? ("SHOPIFY_CURRENT_PRICE" as VaSource) : undefined,
      vaObservedAt: v.priceUsd ? mirror.fetchedAt : undefined,
      shopifyVariantId: v.shopifyVariantId,
    })),
    status: "template",
    officialStoreEligible: false, // decisión explícita del operador, nunca implícita
    fastShipping: {
      warehouseAssigned: false,
      carrierServiceAvailable: false,
      cutoffDefined: false,
      slaRegistered: false,
    },
    source: {
      type: "shopify_mirror",
      shopifyProductId: mirror.shopifyProductId,
      mirrorId: mirror.id,
      importedAt: nowIso,
    },
    createdAt: nowIso,
    updatedAt: nowIso,
    version: OFFICIAL_PRODUCTS_SCHEMA_VERSION,
  };
}

/** Clave de stock de una variante (coincide con el ledger: SKU preferido). */
export function variantStockKey(product: PrimeBuildOfficialProduct, variant: OfficialVariant): string {
  return variant.sku && variant.sku.trim() ? variant.sku.trim() : product.id;
}
