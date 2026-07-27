/**
 * Adaptadores del mirror hacia la UI del storefront (PBOS-SCLP-FABLE-002).
 * Puros y testeables: convierten un registro espejado en tarjeta (§6) y en un
 * producto oficial efímero para cotizar PB (§23-§24: VA = precio observado de
 * la fuente; VN = VA × 0.90 UNA vez; el compare-at observado se muestra
 * tachado). El stock propio viene SIEMPRE del ledger, jamás del espejo.
 */

import type { ShopifyCatalogMirrorRecord } from "./catalog-mirror";
import { importProductFromMirror, type PrimeBuildOfficialProduct } from "./official-products";
import { calculateStorePrice } from "./pb-exchange/pb-exchange-sdk";
import type { CardProduct } from "@/components/shop/product-card";

let seq = 0;
const ephemeralId = () => `eph_${++seq}`;

/** Producto oficial efímero (para cotización/PDP) desde el espejo. */
export function officialFromMirror(rec: ShopifyCatalogMirrorRecord): PrimeBuildOfficialProduct {
  return importProductFromMirror(rec, rec.fetchedAt, ephemeralId);
}

export function cardFromMirror(
  rec: ShopifyCatalogMirrorRecord,
  _ownedAvailable: number,
  nowIso: string = new Date().toISOString(),
): CardProduct {
  const priced = rec.variants.find((v) => v.priceUsd);
  let pbDisplay: string | undefined;
  let vnUsd: string | undefined;
  let compareAtUsd: string | undefined;
  if (priced?.priceUsd) {
    const s = calculateStorePrice({
      vaUsd: priced.priceUsd,
      vaSource: "SHOPIFY_CURRENT_PRICE",
      vaObservedAt: rec.fetchedAt,
      at: nowIso,
    });
    pbDisplay = s.pbDisplay;
    vnUsd = s.vnUsd;
    // Tachado: compare-at observado si existe; si no, el VA de referencia.
    compareAtUsd = priced.compareAtPriceUsd ?? s.vaUsd;
  }
  return {
    id: rec.shopifyProductId,
    href: `/shop/products/${encodeURIComponent(rec.handle)}`,
    title: rec.title,
    image: rec.mediaUrls[0],
    pbDisplay,
    vnUsd,
    compareAtUsd,
    badge:
      priced?.compareAtPriceUsd && priced.priceUsd &&
      parseFloat(priced.compareAtPriceUsd) > parseFloat(priced.priceUsd)
        ? "Sale"
        : undefined,
    fastShipping: false, // el envío rápido exige verificación propia (§14 MEGA-001)
  };
}

/** Productos del espejo pertenecientes a una colección (relación observada o tag de regla). */
export function mirrorProductsInCollection(
  products: ShopifyCatalogMirrorRecord[],
  collectionHandle: string,
  ruleTag?: string,
): ShopifyCatalogMirrorRecord[] {
  const tag = ruleTag?.toLowerCase();
  return products.filter(
    (p) =>
      p.collections.includes(collectionHandle) ||
      (tag ? p.tags.some((t) => t.toLowerCase() === tag) : false),
  );
}
