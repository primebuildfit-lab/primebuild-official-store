"use client";

/** Shipping (MEGA-004 004C): política honesta — nada desconocido se promete. */
export default function ShippingPage() {
  const rows: Array<[string, string]> = [
    [
      "Envío estándar",
      "Coste por cotizar en el checkout — lo desconocido nunca se muestra como 0 ni como gratis.",
    ],
    ["Recogida en almacén", "Sin coste. Disponible al confirmar el pedido."],
    [
      "Envío rápido ⚡",
      "Solo se promete cuando stock físico, almacén, transportista, hora de corte, destino y SLA están verificados para ese producto. Hoy: pendiente de registrar SLA (decisión operativa del propietario).",
    ],
    [
      "Origen",
      "Todos los pedidos de esta tienda salen del almacén propio de PrimeBuild — no del proveedor dropshipping.",
    ],
    [
      "Seguimiento",
      "El estado real de tu pedido vive en Order Status / Mi cuenta; los tracking numbers se añaden al enviarse.",
    ],
  ];
  return (
    <div className="pb-catdesc">
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <span className="pb-catdesc-eyebrow">Shipping</span>
        <h1 className="pbsf-serif-heading" style={{ textAlign: "left" }}>
          Envíos
        </h1>
        <div style={{ display: "grid", gap: 18 }}>
          {rows.map(([t, d]) => (
            <div key={t}>
              <h2 className="pb-catdesc-heading" style={{ fontSize: 19 }}>
                {t}
              </h2>
              <p className="pb-catdesc-body" style={{ margin: 0 }}>
                {d}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
