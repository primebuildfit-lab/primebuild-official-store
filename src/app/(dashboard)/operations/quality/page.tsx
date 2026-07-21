import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { QualityBoard } from "@/components/os/quality-board";

export const metadata: Metadata = { title: "Calidad y trazabilidad" };

/**
 * Calidad y trazabilidad (PBOS-QUALITY-CORRECTIVE-001). Observes and relates real
 * quality signals (damage, quarantine, discrepancies, lots) across the local
 * spaces. Incidents never modify inventory by themselves; any quantity change goes
 * through the append-only ledger; lots/serials/expiry appear only with real data;
 * nothing is invented, discarded, returned to a supplier, or written to Shopify.
 */
export default function QualityPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Operación"
        title="Calidad y trazabilidad"
        description="Incidencias, cuarentena, discrepancias y trazabilidad, sobre datos reales."
        icon="shield"
      />

      <Panel className="mb-6" icon="shield" title="Solo datos reales, sin alterar saldos">
        <p className="text-sm text-muted">
          Observa señales reales (dañado, cuarentena, discrepancias, lotes) y las relaciona. Una
          incidencia <span className="font-medium text-foreground">no modifica inventario</span> por
          sí sola; cualquier cambio de cantidad usa el ledger append-only (liberar cuarentena crea
          movimientos, no edita saldos). Lotes, seriales y caducidad solo aparecen con dato real. La
          ausencia de incidencias no es garantía de calidad; no se verifica un proveedor por
          ausencia de discrepancias; no se devuelve a proveedor, no se desecha y no se toca Shopify.
        </p>
      </Panel>

      <QualityBoard />
    </div>
  );
}
