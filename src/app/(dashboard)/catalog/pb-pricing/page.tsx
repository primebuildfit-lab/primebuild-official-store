import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { PbPricingBoard } from "@/components/os/pb-pricing-board";

export const metadata: Metadata = { title: "Precios PB" };

/**
 * Precio principal en PB (PBOS-DPB-MEGA-FABLE-001 §35-§41): VN = VA × 0.90 con
 * política versionada y conversión por el contrato PB_EXCHANGE_V1. USD siempre
 * visible; el 1% de transferencias no aplica a compras.
 */
export default function PbPricingPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Catálogo"
        title="Precios PB"
        description="Política de descuento, tasas del contrato y precio por variante."
        icon="coins"
      />
      <Panel className="mb-6" icon="shield" title="Reglas del precio">
        <p className="text-sm text-muted">
          El VA siempre lleva <span className="font-medium text-foreground">fuente declarada</span> y
          momento (nunca un «precio anterior» falso); el descuento se aplica UNA vez; el PB mostrado
          proviene de un quote con snapshot — jamás hardcodeado. El modo dinero real permanece
          deshabilitado hasta proveedor + aprobación del propietario.
        </p>
      </Panel>
      <PbPricingBoard />
    </div>
  );
}
