"use client";

import { PBPriceBreakdown } from "@/components/pb/pb-components";
import {
  BUY_RATE_LABEL,
  SELL_RATE_LABEL,
  calculateStorePrice,
} from "@/lib/pb-exchange/pb-exchange-sdk";

/**
 * PB Pricing Explained (MEGA-004 004C): la mecánica real del precio, con un
 * ejemplo calculado EN VIVO por el mismo contrato que usa el checkout —
 * nunca números pegados a mano.
 */
export default function PbPricingExplainedPage() {
  const example = calculateStorePrice({
    vaUsd: "100.00",
    vaSource: "APPROVED_REFERENCE_PRICE",
    vaObservedAt: new Date().toISOString(),
    at: new Date().toISOString(),
  });

  return (
    <div className="pb-catdesc">
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <span className="pb-catdesc-eyebrow">PB Pricing</span>
        <h1 className="pbsf-serif-heading" style={{ textAlign: "left" }}>
          Cómo funciona el precio en PB
        </h1>
        <ol className="pb-catdesc-body" style={{ paddingLeft: 18, display: "grid", gap: 10 }}>
          <li>
            <strong>Precio de referencia (VA)</strong>: el precio observado del producto, con fuente
            y fecha declaradas — jamás un “antes” inventado.
          </li>
          <li>
            <strong>Descuento Official Store</strong>: hoy ≈10 % (política versionada
            {" "}{example.policyId} v{example.policyVersion}), aplicado UNA sola vez → precio nuevo (VN).
          </li>
          <li>
            <strong>Conversión a PB</strong>: el VN se convierte con el contrato PB Exchange V1
            (tasas literales del propietario: «{BUY_RATE_LABEL}» / «{SELL_RATE_LABEL}») y el
            snapshot de tasa viaja con tu carrito.
          </li>
          <li>
            <strong>USD siempre visible</strong>: puedes pagar en USD; el PB está en modo cotización
            hasta que exista proveedor financiero.
          </li>
          <li>
            <strong>Sin dobles cobros</strong>: la comisión del 1 % es SOLO de transferencias PB
            entre usuarios; las compras no la pagan. Envío e impuestos se muestran aparte.
          </li>
        </ol>
        <h2 className="pb-catdesc-heading" style={{ marginTop: 28 }}>Ejemplo en vivo (VA = $100)</h2>
        <div style={{ maxWidth: 460 }}>
          <PBPriceBreakdown snapshot={example} />
        </div>
      </div>
    </div>
  );
}
