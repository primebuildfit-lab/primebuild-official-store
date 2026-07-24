"use client";

import Link from "next/link";

/** Devoluciones (§50): política honesta; la solicitud vive en cada pedido entregado. */
export default function ShopReturnsPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <h1 className="text-2xl font-bold">Devoluciones</h1>
      <section className="rounded-xl border border-neutral-800 p-5 text-sm text-neutral-300">
        <ul className="flex list-inside list-disc flex-col gap-2">
          <li>Ventana de devolución: 30 días desde la entrega para artículos sin uso.</li>
          <li>La solicitud se hace desde el pedido entregado en <Link href="/shop/account" className="text-amber-400 hover:underline">Mi cuenta</Link>.</li>
          <li>Cada devolución pasa por recepción e inspección física antes de decidir destino (reintegro a stock, dañado o descarte).</li>
          <li>El reembolso se registra como observación con referencia del proveedor de pago; la tienda no edita ningún ledger financiero directamente.</li>
        </ul>
      </section>
      <p className="text-xs text-neutral-500">
        Sin proveedor financiero conectado los reembolsos quedan como solicitudes observadas — nunca se
        marca «Reembolsado» sin evidencia.
      </p>
    </div>
  );
}
