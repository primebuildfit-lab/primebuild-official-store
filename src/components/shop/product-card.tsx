"use client";

import Link from "next/link";
import { useMemo } from "react";
import { computeVariantPrice } from "@/lib/store-pricing";
import { fastShippingVerdict } from "@/lib/owned-inventory";
import { localId } from "@/lib/local-collection";
import { formatUsd, formatPb } from "@/lib/pb-exchange/pb-exchange-sdk";
import type { PrimeBuildOfficialProduct } from "@/lib/official-products";

/**
 * Tarjeta de producto del storefront (§43): imagen, título, precio PB
 * principal, USD secundario, estado de stock, badge de envío rápido SOLO si
 * está verificado, y variantes disponibles. Nunca se renderiza con
 * available <= 0 (el catálogo visible ya lo filtró).
 */
export function ProductCard({
  product,
  availableTotal,
}: {
  product: PrimeBuildOfficialProduct;
  availableTotal: number;
}) {
  const price = useMemo(() => {
    const v = product.variants.find((x) => x.vaUsd);
    if (!v) return null;
    const r = computeVariantPrice(product, v, new Date().toISOString(), localId);
    return r.ok ? r.quote.snapshot : null;
  }, [product]);

  const fast = fastShippingVerdict({
    stockConfirmed: availableTotal > 0,
    warehouseAssigned: product.fastShipping.warehouseAssigned,
    carrierServiceAvailable: product.fastShipping.carrierServiceAvailable,
    cutoffDefined: product.fastShipping.cutoffDefined,
    destinationEligible: true, // se confirma por destino en el checkout
    slaRegistered: product.fastShipping.slaRegistered,
  });

  return (
    <Link
      href={`/shop/product/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/40 transition-colors hover:border-amber-400/50"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-neutral-900">
        {product.mediaUrls[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.mediaUrls[0]}
            alt={product.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-neutral-700">
            ◫
          </div>
        )}
        {fast.eligible ? (
          <span className="absolute left-2 top-2 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[0.65rem] font-semibold text-black">
            ⚡ Envío rápido
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm font-medium">{product.title}</h3>
        {price ? (
          <div className="mt-auto">
            <p className="font-mono text-base font-bold text-amber-300">
              {formatPb(price.pbDisplay)}
            </p>
            <p className="text-xs text-neutral-400">
              ≈ {formatUsd(price.vnUsd)} · ahorra {formatUsd(price.savingsUsd)}
            </p>
          </div>
        ) : (
          <p className="mt-auto text-xs text-neutral-500">Precio pendiente de referencia</p>
        )}
        <p className="text-[0.7rem] text-neutral-500">
          {availableTotal > 0 ? `${availableTotal} en stock` : "Sin stock"} ·{" "}
          {product.variants.length} variante{product.variants.length === 1 ? "" : "s"}
        </p>
      </div>
    </Link>
  );
}
