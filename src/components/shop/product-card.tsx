"use client";

import Link from "next/link";
import { computeVariantPrice } from "@/lib/store-pricing";
import { fastShippingVerdict } from "@/lib/owned-inventory";
import { localId } from "@/lib/local-collection";
import { formatPb } from "@/lib/pb-exchange/pb-exchange-sdk";
import type { PrimeBuildOfficialProduct } from "@/lib/official-products";

/**
 * Tarjeta de producto clonada del theme (pb-card, PBOS-SCLP-FABLE-002 §6):
 * imagen 1:1 sobre #141414 con zoom al hover, badge dorado, título 2 líneas
 * 13px y línea de precio. Diferencia deliberada de la orden: el PB es el
 * precio principal (dorado) con el USD como secundario y el precio de
 * referencia tachado (§24) — el resto es paridad visual.
 */

export interface CardProduct {
  id: string;
  href: string;
  title: string;
  image?: string;
  /** Precio principal en PB (ya formateado como decimal). */
  pbDisplay?: string;
  /** USD nuevo (VN) como secundario. */
  vnUsd?: string;
  /** Referencia tachada (VA / compare-at). */
  compareAtUsd?: string;
  badge?: string;
  fastShipping?: boolean;
}

export function ProductCard({ product }: { product: CardProduct }) {
  return (
    <Link href={product.href} className="pb-card">
      <div className="pb-card-image">
        {product.badge ? <span className="pb-badge">{product.badge}</span> : null}
        {product.fastShipping ? <span className="pb-badge pb-badge--fast" style={{ left: "auto", right: 12 }}>⚡ Fast</span> : null}
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt={product.title} loading="lazy" />
        ) : null}
      </div>
      <h3 className="pb-card-title">{product.title}</h3>
      <div className="pb-card-price">
        {product.pbDisplay ? <span className="pb-price-pb">{formatPb(product.pbDisplay)}</span> : null}
        {product.compareAtUsd ? <span className="pb-price-compare">${product.compareAtUsd}</span> : null}
        {product.vnUsd ? <span className="pb-price-secondary">${product.vnUsd}</span> : null}
      </div>
    </Link>
  );
}

/** Construye la vista de tarjeta desde un producto oficial + su disponibilidad. */
export function cardFromOfficialProduct(
  product: PrimeBuildOfficialProduct,
  availableTotal: number,
): CardProduct {
  const variant = product.variants.find((v) => v.vaUsd);
  let pbDisplay: string | undefined;
  let vnUsd: string | undefined;
  let compareAtUsd: string | undefined;
  if (variant) {
    const r = computeVariantPrice(product, variant, new Date().toISOString(), localId);
    if (r.ok) {
      pbDisplay = r.quote.snapshot.pbDisplay;
      vnUsd = r.quote.snapshot.vnUsd;
      compareAtUsd = r.quote.snapshot.vaUsd;
    }
  }
  const fast = fastShippingVerdict({
    stockConfirmed: availableTotal > 0,
    warehouseAssigned: product.fastShipping.warehouseAssigned,
    carrierServiceAvailable: product.fastShipping.carrierServiceAvailable,
    cutoffDefined: product.fastShipping.cutoffDefined,
    destinationEligible: true,
    slaRegistered: product.fastShipping.slaRegistered,
  });
  return {
    id: product.id,
    href: `/shop/products/${encodeURIComponent(product.handle || product.id)}`,
    title: product.title,
    image: product.mediaUrls[0],
    pbDisplay,
    vnUsd,
    compareAtUsd,
    badge: compareAtUsd && vnUsd && parseFloat(compareAtUsd) > parseFloat(vnUsd) ? "Sale" : undefined,
    fastShipping: fast.eligible,
  };
}
