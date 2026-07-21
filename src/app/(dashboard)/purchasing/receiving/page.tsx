import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { ReceivingBoard } from "@/components/os/receiving-board";

export const metadata: Metadata = { title: "Recepciones" };

/**
 * Recepciones (PBOS-001 · ORDEN 10). Receive against a purchase order with partial
 * receipts, discrepancies and quarantine. Closed receipts are immutable and never
 * overwritten. It does not update inventory — the canonical stock update belongs
 * to PBOS-INVENTORY-001; damaged/quarantined goods never become available.
 */
export default function ReceivingPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Compras"
        title="Recepciones"
        description="Recepción física contra órdenes de compra, con parciales y discrepancias."
        icon="inbox"
      />

      <Panel className="mb-6" icon="shield" title="Recibir registra, no contabiliza inventario">
        <p className="text-sm text-muted">
          Cada recepción parte de una orden de compra y admite parciales; una recepción cerrada es
          inmutable y no se sobrescribe. Esta pantalla{" "}
          <span className="font-medium text-foreground">no actualiza el inventario</span>: la
          recepción queda pendiente de contabilización y la actualización canónica de existencias
          corresponde a PBOS-INVENTORY-001. La mercancía dañada o en cuarentena nunca pasa
          automáticamente a disponible.
        </p>
      </Panel>

      <ReceivingBoard />
    </div>
  );
}
