"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PBPriceBreakdown } from "@/components/pb/pb-components";
import { localId } from "@/lib/local-collection";
import { fastShippingVerdict } from "@/lib/owned-inventory";
import { computeVariantPrice } from "@/lib/store-pricing";
import { useCartLines, useStorefrontCatalog, useStoreEvents } from "@/lib/official-store-data";
import { sanitizeProductHtml } from "@/lib/official-products";
import { formatPb, formatUsd } from "@/lib/pb-exchange/pb-exchange-sdk";

/**
 * Página de producto (§44): medios, descripción, variantes, stock disponible,
 * precio PB principal + USD secundario + ahorro, envío/devoluciones y añadir
 * al carrito con snapshot de precio (§38). La cantidad nunca supera el
 * disponible (§45).
 */
export default function ShopProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const catalog = useStorefrontCatalog();
  const cart = useCartLines();
  const { emit } = useStoreEvents();

  const product = catalog.products.find((p) => p.id === params.id);
  const [variantId, setVariantId] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const variant = product?.variants.find((v) => v.id === (variantId || product.variants[0]?.id));
  const availability = variant ? (catalog.variantAvailability.get(variant.id)?.available ?? 0) : 0;
  const warehouseId = variant ? (catalog.variantAvailability.get(variant.id)?.warehouseId ?? null) : null;

  const price = useMemo(() => {
    if (!product || !variant) return null;
    const r = computeVariantPrice(product, variant, new Date().toISOString(), localId);
    return r.ok ? r.quote : null;
  }, [product, variant]);

  if (!catalog.ready) return <p className="text-sm text-neutral-500">Cargando…</p>;
  if (!product || catalog.publication.get(product.id) !== "visible") {
    return (
      <div className="rounded-xl border border-dashed border-neutral-700 p-10 text-center">
        <p className="text-sm text-neutral-400">Este producto no está disponible ahora mismo.</p>
        <Link href="/shop/catalog" className="mt-2 inline-block text-sm text-amber-400 hover:underline">
          ← Volver a la tienda
        </Link>
      </div>
    );
  }

  const fast = fastShippingVerdict({
    stockConfirmed: availability > 0,
    warehouseAssigned: product.fastShipping.warehouseAssigned,
    carrierServiceAvailable: product.fastShipping.carrierServiceAvailable,
    cutoffDefined: product.fastShipping.cutoffDefined,
    destinationEligible: true,
    slaRegistered: product.fastShipping.slaRegistered,
  });

  const addToCart = () => {
    if (!variant || !price || qty < 1 || qty > availability || !warehouseId) return;
    cart.add({
      id: localId(),
      productId: product.id,
      variantId: variant.id,
      title: product.title,
      variantTitle: variant.title,
      sku: variant.sku,
      warehouseId,
      quantity: qty,
      priceQuote: price,
      addedAt: new Date().toISOString(),
    });
    emit("pb.store_price_created", { productId: product.id, vn: price.snapshot.vnUsd }, price.id);
    setAdded(true);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
        {product.mediaUrls[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.mediaUrls[0]} alt={product.title} className="w-full object-cover" />
        ) : (
          <div className="flex aspect-square items-center justify-center text-6xl text-neutral-700">◫</div>
        )}
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-bold">{product.title}</h1>
          <p className="mt-1 text-xs text-neutral-500">
            {availability > 0 ? `${availability} unidades disponibles` : "Sin stock"} · fuente: ledger
            de almacén
          </p>
        </div>

        {price ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="font-mono text-3xl font-bold text-amber-300">
              {formatPb(price.snapshot.pbDisplay)}
            </p>
            <p className="mt-1 text-sm text-neutral-300">
              Equivalente observado: {formatUsd(price.snapshot.vnUsd)}{" "}
              <span className="text-emerald-400">· ahorras {formatUsd(price.snapshot.savingsUsd)}</span>
            </p>
            <div className="mt-3 border-t border-neutral-800 pt-3">
              <PBPriceBreakdown snapshot={price.snapshot} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">Precio pendiente de valor de referencia.</p>
        )}

        {product.variants.length > 1 ? (
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-neutral-500">Variante</span>
            <select
              value={variant?.id ?? ""}
              onChange={(e) => setVariantId(e.target.value)}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
            >
              {product.variants.map((v) => {
                const a = catalog.variantAvailability.get(v.id)?.available ?? 0;
                return (
                  <option key={v.id} value={v.id} disabled={a <= 0}>
                    {v.title} {a <= 0 ? "(agotada)" : `(${a} disp.)`}
                  </option>
                );
              })}
            </select>
          </label>
        ) : null}

        <div className="flex items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wider text-neutral-500">Cantidad</span>
            <input
              type="number"
              min={1}
              max={Math.max(1, availability)}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.min(availability, Number(e.target.value) || 1)))}
              className="w-24 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-sm"
            />
          </label>
          <button
            onClick={addToCart}
            disabled={!price || availability <= 0 || !warehouseId}
            className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Añadir al carrito
          </button>
          {added ? (
            <button
              onClick={() => router.push("/shop/cart")}
              className="rounded-lg border border-emerald-500/50 px-4 py-2.5 text-sm text-emerald-400"
            >
              ✓ Añadido — ver carrito
            </button>
          ) : null}
        </div>

        <div className="rounded-xl border border-neutral-800 p-4 text-sm">
          {fast.eligible ? (
            <p className="text-emerald-400">⚡ Envío rápido verificado para este producto.</p>
          ) : (
            <p className="text-neutral-400">
              Envío estándar. El envío rápido solo se promete con todas las condiciones verificadas
              {fast.missing.length > 0 ? ` (faltan: ${fast.missing.join(", ")})` : ""}.
            </p>
          )}
          <p className="mt-2 text-xs text-neutral-500">
            Devoluciones según la política de la tienda (ver Devoluciones). El pago PB queda en modo
            cotización hasta conectar el proveedor financiero; USD siempre disponible.
          </p>
        </div>

        {product.descriptionHtml ? (
          <div
            className="prose prose-sm prose-invert max-w-none text-neutral-300"
            // Sanitizado en import y de nuevo aquí (§81: XSS por contenido).
            dangerouslySetInnerHTML={{ __html: sanitizeProductHtml(product.descriptionHtml) }}
          />
        ) : null}
      </div>
    </div>
  );
}
