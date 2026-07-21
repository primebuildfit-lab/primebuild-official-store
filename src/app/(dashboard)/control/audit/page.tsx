import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { AuditBoard } from "@/components/os/audit-board";

export const metadata: Metadata = { title: "Auditoría" };

/**
 * Auditoría (PBOS-001 · ORDEN 27). A readable audit built from real events already
 * recorded across the local spaces (ledger, purchase orders, transfers, returns,
 * fulfillments, store revisions, automations, orders). Text is masked; failures
 * are included; export is capability-gated. Nothing is fabricated.
 */
export default function AuditPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Control"
        title="Auditoría"
        description="Eventos reales, legibles y enmascarados, de todos los espacios."
        icon="shield"
      />

      <Panel className="mb-6" icon="shield" title="Legible, enmascarada, con fallos incluidos">
        <p className="text-sm text-muted">
          La auditoría agrega <span className="font-medium text-foreground">eventos reales</span> ya
          registrados en el ledger, órdenes de compra, transferencias, devoluciones, fulfillment,
          revisiones de tienda, automatizaciones y pedidos. Se muestra un resumen legible (no solo
          JSON) con datos personales, tokens y secretos{" "}
          <span className="font-medium text-foreground">enmascarados</span>; los fallos y acciones
          bloqueadas se incluyen; y la exportación requiere capacidad.
        </p>
      </Panel>

      <AuditBoard />
    </div>
  );
}
