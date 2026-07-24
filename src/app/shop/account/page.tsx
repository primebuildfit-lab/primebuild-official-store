"use client";

import Link from "next/link";
import { useOfficialOrders } from "@/lib/official-store-data";
import { orderTotals } from "@/lib/storefront";
import { formatPb, formatUsd } from "@/lib/pb-exchange/pb-exchange-sdk";

/** Cuenta (§42): pedidos locales de este dispositivo, con estado honesto. */
export default function ShopAccountPage() {
  const orders = useOfficialOrders();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Mi cuenta</h1>
        <p className="text-sm text-neutral-400">
          Pedidos realizados desde este dispositivo. La identidad unificada del ecosistema (Nexus)
          llegará sin crear cuentas nuevas por tienda.
        </p>
      </header>
      {!orders.ready ? (
        <p className="text-sm text-neutral-500">Cargando…</p>
      ) : orders.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-700 p-10 text-center text-sm text-neutral-400">
          Aún no tienes pedidos.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {[...orders.items]
            .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
            .map((o) => {
              const t = orderTotals(o.items);
              return (
                <Link
                  key={o.id}
                  href={`/shop/orders/${o.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 hover:border-amber-400/50"
                >
                  <div>
                    <p className="font-mono text-xs text-neutral-500">{o.id}</p>
                    <p className="mt-0.5 text-sm">
                      {t.itemsCount} unidad{t.itemsCount === 1 ? "" : "es"} ·{" "}
                      {o.createdAt.slice(0, 10)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm text-amber-300">{formatPb(t.pbTotalDisplay)}</p>
                    <p className="text-xs text-neutral-500">≈ {formatUsd(t.vnTotalUsd)}</p>
                  </div>
                  <span className="rounded-full border border-neutral-700 px-2.5 py-1 text-[0.7rem] text-neutral-300">
                    {o.state}
                  </span>
                </Link>
              );
            })}
        </div>
      )}
    </div>
  );
}
