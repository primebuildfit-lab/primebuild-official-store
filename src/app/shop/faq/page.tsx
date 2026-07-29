"use client";

/** FAQ (MEGA-004 004C): respuestas reales, sin promesas fabricadas. */
export default function FaqPage() {
  const faqs: Array<[string, string]> = [
    [
      "¿En qué se diferencia esta tienda de primebuildfit.com?",
      "primebuildfit.com es la tienda dropshipping (catálogo del proveedor). La Official Store vende solo inventario físico propio de PrimeBuild, con reserva real de stock y envío desde nuestro almacén.",
    ],
    [
      "¿Qué es el precio en PB?",
      "El precio principal: referencia −10 % convertido a PB con el contrato PB Exchange V1. El equivalente USD siempre está visible y puedes pagar en USD.",
    ],
    [
      "¿Puedo pagar con PB ya?",
      "El pago PB está en modo cotización hasta que el proveedor financiero esté conectado; el pedido queda pendiente de pago. USD funciona como opción registrada con referencia.",
    ],
    [
      "¿Por qué no veo un producto que sí está en primebuildfit.com?",
      "Porque aquí solo se publica lo que tiene stock físico propio disponible. En cuanto entra stock al almacén, aparece automáticamente.",
    ],
    [
      "¿Cuánto dura mi reserva en el checkout?",
      "30 minutos desde la validación del carrito. Si expira, las unidades vuelven a estar disponibles.",
    ],
    [
      "¿Cómo devuelvo un producto?",
      "30 días desde la entrega para artículos sin uso. Se solicita desde tu pedido entregado; toda devolución pasa inspección física antes de reintegrarse.",
    ],
    [
      "¿Los PB Coins de rewards son lo mismo que el precio PB?",
      "No. Los PB Coins del programa de recompensas (perfil legado) viven en primebuildfit.com y no se mezclan con el nuevo perfil PB Exchange V1.",
    ],
  ];
  return (
    <div className="pb-catdesc">
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <span className="pb-catdesc-eyebrow">FAQ</span>
        <h1 className="pbsf-serif-heading" style={{ textAlign: "left" }}>
          Preguntas frecuentes
        </h1>
        <div style={{ display: "grid", gap: 8 }}>
          {faqs.map(([q, a]) => (
            <details
              key={q}
              style={{ border: "1px solid var(--pbsf-line)", borderRadius: 8, padding: "14px 18px" }}
            >
              <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 15 }}>{q}</summary>
              <p className="pb-catdesc-body" style={{ margin: "10px 0 0" }}>
                {a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
