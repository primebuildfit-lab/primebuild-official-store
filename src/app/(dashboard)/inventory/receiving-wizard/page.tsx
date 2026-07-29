import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { ReceivingWizard } from "@/components/os/receiving-wizard";

export const metadata: Metadata = { title: "Wizard de recepción" };

/**
 * Primer stock físico, guiado (MEGA-FABLE-004 004E): producto espejado →
 * SKU → almacén → cantidad → verificación inmediata de visibilidad y precio.
 */
export default function ReceivingWizardPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Inventario"
        title="Wizard de recepción"
        description="Recibe las primeras unidades reales con verificación inmediata."
        icon="inbox"
      />
      <Panel className="mb-6" icon="shield" title="Reglas de la recepción">
        <p className="text-sm text-muted">
          La cantidad la cuentas TÚ con las unidades delante — el stock del proveedor del espejo
          jamás se copia. Una recepción real exige evidencia de origen; el modo DEMO queda etiquetado
          en el motivo. Todo entra al ledger append-only con actor y motivo; corregir = movimiento
          compensatorio auditado.
        </p>
      </Panel>
      <ReceivingWizard />
    </div>
  );
}
