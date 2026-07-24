"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { localId } from "@/lib/local-collection";
import { computeVariantPrice } from "@/lib/store-pricing";
import { useCartLines, useStorefrontCatalog, useStoreEvents } from "@/lib/official-store-data";
import { formatPb, formatUsd } from "@/lib/pb-exchange/pb-exchange-sdk";

/**
 * Compra por volumen (§15, §45): matriz variante × cantidad con validación de
 * stock por línea, recuento estimado de bultos y total PB/USD. Nunca permite
 * cantidades por encima del disponible; los descuentos por tramos futuros no
 * se inventan (§15: "No crear descuentos no definidos").
 */
export default function ShopBulkPage() {
  const catalog = useStorefrontCatalog();
  const cart = useCartLines();
  const { emit } = useStoreEvents();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [addedCount, setAddedCount] = useState<number | null>(null);

  const rows = useMemo(() => {
    const out: {
      productId: string;
      productTitle: string;
      variantId: string;
      variantTitle: string;
      sku?: string;
      available: number;
      warehouseId: string | null;
      vnUsd: string | null;
      pbDisplay: string | null;
    }[] = [];
    for (const p of catalog.visibleProducts) {
      for (const v of p.variants) {
        const a = catalog.variantAvailability.get(v.id);
        if (!a || a.available <= 0) continue;
        const price = v.vaUsd ? computeVariantPrice(p, v, new Date().toISOString(), localId) : null;
        out.push({
          productId: p.id,
          productTitle: p.title,
          variantId: v.id,
          variantTitle: v.title,
          sku: v.sku,
          available: a.available,
          warehouseId: a.warehouseId,
          vnUsd: price?.ok ? price.quote.snapshot.vnUsd : null,
          pbDisplay: price?.ok ? price.quote.snapshot.pbDisplay : null,
        });
      }
    }
    return out;
  }, [catalog]);

  const totals = useMemo(() => {
    let units = 0;
    let usd = 0;
    let pb = 0;
    for (const r of rows) {
      const q = qty[r.variantId] ?? 0;
      if (q <= 0) continue;
      units += q;
      if (r.vnUsd) usd += parseFloat(r.vnUsd) * q;
      if (r.pbDisplay) pb += parseFloat(r.pbDisplay) * q;
    }
    return { units, usd: usd.toFixed(2), pb: pb.toFixed(2), packages: Math.ceil(units / 10) };
  }, [rows, qty]);

  const addAll = () => {
    const now = new Date().toISOString();
    let added = 0;
    for (const r of rows) {
      const q = qty[r.variantId] ?? 0;
      if (q <= 0 || q > r.available || !r.warehouseId) continue;
      const product = catalog.visibleProducts.find((p) => p.id === r.productId);
      const variant = product?.variants.find((v) => v.id === r.variantId);
      if (!product || !variant) continue;
      const price = computeVariantPrice(product, variant, now, localId);
      if (!price.ok) continue;
      cart.add({
        id: localId(),
        productId: r.productId,
        variantId: r.variantId,
        title: r.productTitle,
        variantTitle: r.variantTitle,
        sku: r.sku,
        warehouseId: r.warehouseId,
        quantity: q,
        priceQuote: price.quote,
        addedAt: now,
      });
      emit("pb.store_price_created", { productId: r.productId, vn: price.quote.snapshot.vnUsd }, price.quote.id);
      added += q;
    }
    setAddedCount(added);
    if (added > 0) setQty({});
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Compra por volumen</h1>
        <p className="text-sm text-neutral-400">
          Pensada para compradores de negocio: cantidades validadas contra el stock real, total PB/USD
          y estimación de bultos. Los tramos de descuento por volumen se anunciarán cuando existan.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-700 p-10 text-center text-sm text-neutral-400">
          No hay variantes con stock disponible para compra por volumen.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900/60 text-[0.7rem] uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-3 py-2">Producto / variante</th>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2 text-right">Disponible</th>
                <th className="px-3 py-2 text-right">PB unidad</th>
                <th className="px-3 py-2 text-right">USD unidad</th>
                <th className="px-3 py-2 text-right">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const q = qty[r.variantId] ?? 0;
                const over = q > r.available;
                return (
                  <tr key={r.variantId} className="border-t border-neutral-800/70">
                    <td className="px-3 py-2">
                      <span className="font-medium">{r.productTitle}</span>
                      <span className="text-neutral-500"> · {r.variantTitle}</span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-neutral-400">{r.sku ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-mono">{r.available}</td>
                    <td className="px-3 py-2 text-right font-mono text-amber-300">
                      {r.pbDisplay ? formatPb(r.pbDisplay) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-neutral-400">
                      {r.vnUsd ? formatUsd(r.vnUsd) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        max={r.available}
                        value={q || ""}
                        placeholder="0"
                        onChange={(e) =>
                          setQty((prev) => ({
                            ...prev,
                            [r.variantId]: Math.max(0, Math.min(r.available, Number(e.target.value) || 0)),
                          }))
                        }
                        className={`w-20 rounded-lg border bg-neutral-900 px-2 py-1 text-right font-mono text-sm ${
                          over ? "border-red-500" : "border-neutral-700"
                        }`}
                        aria-label={`Cantidad para ${r.productTitle} ${r.variantTitle}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
        <div className="text-sm">
          <p>
            <span className="font-mono font-semibold">{totals.units}</span> unidades ·{" "}
            <span className="font-mono">{totals.packages}</span> bulto(s) estimados
          </p>
          <p className="mt-0.5 font-mono text-amber-300">
            {formatPb(totals.pb)} <span className="text-neutral-400">≈ {formatUsd(totals.usd)}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {addedCount !== null && addedCount > 0 ? (
            <Link href="/shop/cart" className="text-sm text-emerald-400 hover:underline">
              ✓ {addedCount} unidades añadidas — ver carrito
            </Link>
          ) : null}
          <button
            onClick={addAll}
            disabled={totals.units === 0}
            className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Añadir todo al carrito
          </button>
        </div>
      </div>
    </div>
  );
}
