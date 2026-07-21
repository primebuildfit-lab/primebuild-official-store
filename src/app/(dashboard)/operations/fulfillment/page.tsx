import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { FulfillmentBoard } from "@/components/os/fulfillment-board";

export const metadata: Metadata = { title: "Preparación y envíos" };

/**
 * Preparación y envíos (PBOS-001 · ORDEN 20). Local picking/packing/shipping over
 * real imported orders only. It invents no carrier/tracking/label, never deducts
 * inventory by editing a balance, keeps shipping stages distinct by evidence, and
 * blocks remote confirmation. With zero orders it shows an honest empty state.
 */
export default function FulfillmentPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Operación"
        title="Preparación y envíos"
        description="Picking, packing y envío local de pedidos reales."
        icon="send"
      />

      <Panel className="mb-6" icon="shield" title="Local, sin envío remoto ni saldos editados">
        <p className="text-sm text-muted">
          La preparación usa{" "}
          <span className="font-medium text-foreground">pedidos reales importados</span> (no se
          generan pedidos). El picking registra recogido y faltantes; no se descuenta inventario
          editando saldos y no se sustituye sin política. En envío se distinguen{" "}
          <span className="font-medium text-foreground">Preparado localmente</span>, Etiqueta
          observada, Entregado a transportista, Confirmado por integración y Enviado en Shopify —
          sin combinarlos sin evidencia. &quot;Confirmar envío&quot; remoto está bloqueado; no se
          inventan transportista, tarifa, etiqueta ni tracking.
        </p>
      </Panel>

      <FulfillmentBoard />
    </div>
  );
}
