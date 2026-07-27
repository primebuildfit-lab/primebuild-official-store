"use client";

/** Políticas (§42): reglas visibles de precio, stock y pagos. */
export default function ShopPoliciesPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <h1 className="text-2xl font-bold">Políticas de la tienda</h1>
      {[
        {
          t: "Precio principal en PB",
          d: "El precio nuevo es el valor de referencia menos el descuento vigente de la Official Store (política versionada, hoy ≈10 %). El PB mostrado proviene del contrato PB Exchange V1 con snapshot de tasa; el equivalente USD siempre es visible y es una opción de pago real.",
        },
        {
          t: "Stock y visibilidad",
          d: "Solo vendemos inventario físico propio. Un producto sin unidades disponibles se oculta automáticamente del catálogo; las reservas del checkout duran 30 minutos.",
        },
        {
          t: "Comisiones",
          d: "Las compras NO pagan la comisión de transferencia del 1 % (solo aplica a transferencias PB entre usuarios). Envío e impuestos se muestran por separado y nunca se ocultan en el total.",
        },
        {
          t: "Pagos",
          d: "Hasta conectar el proveedor financiero, el pago PB funciona en modo cotización (el pedido queda pendiente) y los pagos USD se registran con referencia observada. Ningún pedido se marca pagado sin evidencia.",
        },
        {
          t: "Envío rápido",
          d: "La insignia ⚡ solo aparece cuando stock, almacén, transportista, corte, destino y SLA están verificados.",
        },
      ].map((p) => (
        <section key={p.t} className="rounded-xl border border-neutral-800 p-5">
          <h2 className="text-sm font-semibold text-amber-300">{p.t}</h2>
          <p className="mt-1.5 text-sm text-neutral-300">{p.d}</p>
        </section>
      ))}
    </div>
  );
}
