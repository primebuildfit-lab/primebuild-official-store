import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { PurchaseOrdersBoard } from "@/components/os/purchase-orders-board";

export const metadata: Metadata = { title: "Órdenes de compra" };

/**
 * Órdenes de compra (PBOS-001 · ORDEN 9). The full purchase-order lifecycle with
 * non-skippable states. Orders persist locally; every state change is explicit,
 * carries a reason and actor, and is recorded. Creating or exporting an order
 * sends nothing to a supplier.
 */
export default function PurchaseOrdersPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Compras"
        title="Órdenes de compra"
        description="Ciclo completo de OC con estados reales y no saltables."
        icon="clipboard"
      />

      <Panel className="mb-6" icon="shield" title="Cada estado significa algo distinto">
        <p className="text-sm text-muted">
          Crear un borrador no es enviarlo; exportar no es que el proveedor lo reciba; aprobar no es
          emitir; emitir no es confirmar; confirmar no es recibir. Cada cambio de estado registra
          actor, fecha y motivo, y los estados no se saltan. Una OC con actividad no se borra ni
          cambia de moneda. Nada se envía a un proveedor real.
        </p>
      </Panel>

      <PurchaseOrdersBoard />
    </div>
  );
}
