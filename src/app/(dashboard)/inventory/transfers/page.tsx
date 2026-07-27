import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { TransfersBoard } from "@/components/os/transfers-board";

export const metadata: Metadata = { title: "Transferencias" };

/**
 * Transferencias (PBOS-001 · ORDEN 13). Move stock between warehouses with
 * distinct dispatch and receipt movements. Dispatched stock leaves the origin and
 * is In-transit until received; partial receipts keep a pending quantity;
 * movements are idempotent and a dispatched transfer cannot be plainly cancelled.
 * Nothing touches Shopify or remote inventory.
 */
export default function TransfersPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Inventario"
        title="Transferencias"
        description="Movimientos de stock entre almacenes, con tránsito y recepción."
        icon="transfer"
      />

      <Panel className="mb-6" icon="shield" title="Despachar y recibir son pasos distintos">
        <p className="text-sm text-muted">
          Un borrador no modifica inventario; aprobar y preparar no despachan. Al{" "}
          <span className="font-medium text-foreground">despachar</span>, el stock sale del origen y
          queda <span className="font-medium text-foreground">En tránsito</span>: no aparece en el
          destino hasta la <span className="font-medium text-foreground">recepción</span>. Las
          recepciones parciales conservan pendiente, los movimientos son idempotentes y una
          transferencia ya despachada no se cancela sin retorno o resolución.
        </p>
      </Panel>

      <TransfersBoard />
    </div>
  );
}
