"use client";

import Link from "next/link";

/** How It Works (MEGA-004 004C): la separación dropshipping/propio explicada. */
export default function HowItWorksPage() {
  const steps: Array<[string, string]> = [
    [
      "1 · Dos tiendas, una marca",
      "primebuildfit.com sigue siendo la tienda dropshipping (catálogo del proveedor, USD). Esta Official Store vende ÚNICAMENTE inventario físico que PrimeBuild compró y tiene en su almacén.",
    ],
    [
      "2 · Catálogo espejado en vivo",
      "Los productos ACTIVOS de Shopify se copian aquí automáticamente (título, fotos, variantes, SEO). El stock del proveedor JAMÁS cuenta como nuestro.",
    ],
    [
      "3 · Solo se publica lo que existe",
      "Un producto aparece al público únicamente cuando hay unidades físicas disponibles en el ledger del almacén. Agotado = oculto, automático.",
    ],
    [
      "4 · Precio principal en PB",
      "Precio de referencia − 10 % → convertido a PB con el contrato PB Exchange V1. USD siempre visible como alternativa.",
    ],
    [
      "5 · Reserva real en el checkout",
      "Al iniciar el pago reservamos tus unidades 30 minutos: nadie puede comprarlas mientras terminas, y dos compradores nunca se llevan la última unidad a la vez.",
    ],
    [
      "6 · Enviado por PrimeBuild",
      "Picking, empaque y envío desde nuestro almacén. La insignia ⚡ de envío rápido solo aparece con stock, transportista y SLA verificados.",
    ],
  ];
  return (
    <div className="pb-catdesc">
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <span className="pb-catdesc-eyebrow">How it works</span>
        <h1 className="pbsf-serif-heading" style={{ textAlign: "left" }}>
          Cómo funciona la Official Store
        </h1>
        <div style={{ display: "grid", gap: 22 }}>
          {steps.map(([t, d]) => (
            <div key={t}>
              <h2 className="pb-catdesc-heading" style={{ fontSize: 20 }}>
                {t}
              </h2>
              <p className="pb-catdesc-body" style={{ margin: 0 }}>
                {d}
              </p>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 28 }}>
          <Link href="/shop/catalog" className="pb-catdesc-link">
            Ver la tienda
          </Link>
          {"  ·  "}
          <Link href="/shop/pb-pricing" className="pb-catdesc-link">
            Cómo funciona el precio PB
          </Link>
        </p>
      </div>
    </div>
  );
}
