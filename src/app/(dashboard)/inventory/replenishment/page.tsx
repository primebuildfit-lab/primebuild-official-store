import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { ReplenishmentBoard } from "@/components/os/replenishment-board";

export const metadata: Metadata = { title: "Reposición" };

/**
 * Reposición (PBOS-001 · ORDEN 15). Deterministic suggestions from real inputs
 * (policy target, ledger available, PO incoming). Missing required data yields
 * "Datos insuficientes"; no demand/lead time is invented. Accepting writes a
 * Compra rápida draft with full traceability — never a purchase order, never a
 * send.
 */
export default function ReplenishmentPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Inventario"
        title="Reposición"
        description="Sugerencias explicables que alimentan Compra rápida."
        icon="refresh"
      />

      <Panel className="mb-6" icon="shield" title="Explicable, sin automatizar la compra">
        <p className="text-sm text-muted">
          Las sugerencias se calculan con una{" "}
          <span className="font-medium text-foreground">fórmula visible</span> a partir de datos
          reales (objetivo de la política, disponible del ledger, incoming de las órdenes de
          compra). Si falta un dato requerido, se muestra{" "}
          <span className="font-medium text-foreground">&quot;Datos insuficientes&quot;</span> — no
          se inventa una cantidad, ni demanda ni lead time. Aceptar una sugerencia escribe un
          borrador de Compra rápida con trazabilidad;{" "}
          <span className="font-medium text-foreground">nunca</span> crea ni envía una orden de
          compra.
        </p>
      </Panel>

      <ReplenishmentBoard />
    </div>
  );
}
