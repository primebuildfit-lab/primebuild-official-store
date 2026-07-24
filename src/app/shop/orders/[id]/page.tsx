"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useOfficialOrders } from "@/lib/official-store-data";
import { orderTotals, transitionOrder } from "@/lib/storefront";
import { formatPb, formatUsd } from "@/lib/pb-exchange/pb-exchange-sdk";

/** Estado del pedido (§42, §48) con historial y solicitud de devolución (§50). */
export default function ShopOrderPage() {
  const params = useParams<{ id: string }>();
  const orders = useOfficialOrders();
  const order = orders.items.find((o) => o.id === params.id);

  if (!orders.ready) return <p className="text-sm text-neutral-500">Cargando…</p>;
  if (!order) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-700 p-10 text-center">
        <p className="text-sm text-neutral-400">Pedido no encontrado en este dispositivo.</p>
        <Link href="/shop/account" className="mt-2 inline-block text-sm text-amber-400 hover:underline">
          ← Mis pedidos
        </Link>
      </div>
    );
  }

  const t = orderTotals(order.items);
  const requestReturn = () => {
    const r = transitionOrder(order, "Return requested", "cliente", new Date().toISOString());
    if (r.ok) {
      orders.update(order.id, r.order);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-neutral-500">{order.id}</p>
          <h1 className="text-xl font-bold">Pedido</h1>
        </div>
        <span className="rounded-full border border-amber-500/50 bg-amber-500/10 px-3 py-1 text-sm text-amber-300">
          {order.state}
        </span>
      </header>

      <section className="rounded-xl border border-neutral-800 p-4">
        {order.items.map((it) => (
          <div key={it.id} className="flex justify-between border-b border-neutral-800/60 py-2 text-sm last:border-b-0">
            <span>
              {it.title} <span className="text-neutral-500">· {it.variantTitle} × {it.quantity}</span>
            </span>
            <span className="font-mono text-amber-300">
              {formatPb((parseFloat(it.priceQuote.snapshot.pbDisplay) * it.quantity).toFixed(2))}
            </span>
          </div>
        ))}
        <div className="mt-2 flex justify-between text-sm font-semibold">
          <span>Total</span>
          <span className="font-mono text-amber-300">
            {formatPb(t.pbTotalDisplay)} <span className="text-neutral-400">≈ {formatUsd(t.vnTotalUsd)}</span>
          </span>
        </div>
      </section>

      {order.state === "Awaiting payment" ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-xs text-amber-300">
          Pendiente de pago: el pago {order.paymentChoice === "PB" ? "en PB requiere el proveedor financiero (aún no conectado)" : "en USD se registrará como observación con referencia externa"}. Tu stock sigue reservado.
        </p>
      ) : null}

      <section className="rounded-xl border border-neutral-800 p-4">
        <h2 className="text-sm font-semibold">Historial</h2>
        <ul className="mt-2 flex flex-col gap-1.5 text-xs text-neutral-400">
          <li>· {order.createdAt.slice(0, 19).replace("T", " ")} — creado (Draft)</li>
          {order.history.map((h, i) => (
            <li key={i}>
              · {h.at.slice(0, 19).replace("T", " ")} — {h.from} → {h.to}
              {h.note ? ` (${h.note})` : ""}
            </li>
          ))}
        </ul>
      </section>

      {order.state === "Delivered" ? (
        <button
          onClick={requestReturn}
          className="rounded-lg border border-neutral-700 px-5 py-2.5 text-sm hover:border-amber-400/60"
        >
          Solicitar devolución
        </button>
      ) : null}
    </div>
  );
}
