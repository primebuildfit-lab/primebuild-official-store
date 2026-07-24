"use client";

import Link from "next/link";
import { useMemo } from "react";
import { validateCartQuantities, orderTotals } from "@/lib/storefront";
import { useCartLines, useOwnedInventory } from "@/lib/official-store-data";
import { formatPb, formatUsd } from "@/lib/pb-exchange/pb-exchange-sdk";

/** Carrito (§42, §45): líneas con snapshot de precio y validación de stock. */
export default function ShopCartPage() {
  const cart = useCartLines();
  const inventory = useOwnedInventory();

  const issues = useMemo(
    () => validateCartQuantities(cart.items, inventory.availableByKeyWarehouse),
    [cart.items, inventory],
  );
  const totals = useMemo(
    () =>
      orderTotals(
        cart.items.map((l) => ({
          id: l.id,
          productId: l.productId,
          variantId: l.variantId,
          title: l.title,
          variantTitle: l.variantTitle,
          sku: l.sku,
          warehouseId: l.warehouseId,
          quantity: l.quantity,
          priceQuote: l.priceQuote,
        })),
      ),
    [cart.items],
  );

  if (!cart.ready) return <p className="text-sm text-neutral-500">Cargando…</p>;

  if (cart.items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-700 p-12 text-center">
        <p className="text-sm text-neutral-400">Tu carrito está vacío.</p>
        <Link href="/shop/catalog" className="mt-2 inline-block text-sm text-amber-400 hover:underline">
          Ir a la tienda →
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold">Carrito</h1>
        {cart.items.map((l) => {
          const lineIssues = issues.filter((i) => i.lineId === l.id);
          return (
            <div
              key={l.id}
              className={`flex items-center justify-between gap-4 rounded-xl border p-4 ${
                lineIssues.length > 0 ? "border-red-500/60 bg-red-500/5" : "border-neutral-800 bg-neutral-900/40"
              }`}
            >
              <div>
                <p className="text-sm font-medium">{l.title}</p>
                <p className="text-xs text-neutral-500">
                  {l.variantTitle} · {l.sku ?? "sin SKU"} · almacén {l.warehouseId}
                </p>
                {lineIssues.map((i) => (
                  <p key={i.kind} className="mt-1 text-xs text-red-400">
                    {i.detail}
                  </p>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-sm">× {l.quantity}</span>
                <div className="text-right">
                  <p className="font-mono text-sm text-amber-300">
                    {formatPb((parseFloat(l.priceQuote.snapshot.pbDisplay) * l.quantity).toFixed(2))}
                  </p>
                  <p className="text-xs text-neutral-500">
                    ≈ {formatUsd((parseFloat(l.priceQuote.snapshot.vnUsd) * l.quantity).toFixed(2))}
                  </p>
                </div>
                <button
                  onClick={() => cart.remove(l.id)}
                  className="rounded-lg border border-neutral-700 px-2.5 py-1 text-xs text-neutral-400 hover:border-red-500/60 hover:text-red-400"
                >
                  Quitar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <aside className="h-fit rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">Resumen</h2>
        <dl className="mt-3 flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-neutral-400">Unidades</dt>
            <dd className="font-mono">{totals.itemsCount}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-400">Referencia</dt>
            <dd className="font-mono text-neutral-500 line-through">{formatUsd(totals.vaTotalUsd)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-400">Ahorro Official Store</dt>
            <dd className="font-mono text-emerald-400">−{formatUsd(totals.savingsUsd)}</dd>
          </div>
          <div className="mt-1 flex justify-between border-t border-neutral-800 pt-2">
            <dt className="font-medium">Total PB</dt>
            <dd className="font-mono font-bold text-amber-300">{formatPb(totals.pbTotalDisplay)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-400">Equivalente</dt>
            <dd className="font-mono text-neutral-300">{formatUsd(totals.vnTotalUsd)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-[0.7rem] text-neutral-500">
          Envío e impuestos se calculan en el checkout. Sin conceptos ocultos.
        </p>
        <Link
          href={issues.length === 0 ? "/shop/checkout" : "#"}
          aria-disabled={issues.length > 0}
          className={`mt-4 block rounded-lg px-5 py-2.5 text-center text-sm font-semibold ${
            issues.length === 0
              ? "bg-amber-500 text-black hover:bg-amber-400"
              : "cursor-not-allowed bg-neutral-800 text-neutral-500"
          }`}
        >
          {issues.length === 0 ? "Iniciar checkout" : "Corrige las cantidades para continuar"}
        </Link>
      </aside>
    </div>
  );
}
