import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { ReturnsBoard } from "@/components/os/returns-board";

export const metadata: Metadata = { title: "Devoluciones" };

/**
 * Devoluciones (PBOS-001 · ORDEN 21). Five separate planes: physical return,
 * inspection, inventory destination, financial decision and observed refund.
 * Goods are never reintegrated to available before inspection; a destination that
 * produces stock posts an append-only ledger movement (idempotent); refund is
 * observed only. Nothing touches Shopify or a balance directly.
 */
export default function ReturnsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Ventas"
        title="Devoluciones"
        description="Devolución física, inspección, destino de inventario y reembolso, separados."
        icon="undo"
      />

      <Panel className="mb-6" icon="shield" title="Cinco planos, nunca mezclados">
        <p className="text-sm text-muted">
          La <span className="font-medium text-foreground">devolución física</span>, la{" "}
          <span className="font-medium text-foreground">inspección</span>, el{" "}
          <span className="font-medium text-foreground">destino de inventario</span>, la{" "}
          <span className="font-medium text-foreground">decisión financiera</span> y el{" "}
          <span className="font-medium text-foreground">reembolso observado</span> son flujos
          distintos. No se reintegra a disponible antes de inspección; el reintegro va al ledger
          append-only (idempotente, sin editar saldos ni Shopify); el reembolso es observado y una
          nota local no lo marca como completado.
        </p>
      </Panel>

      <ReturnsBoard />
    </div>
  );
}
