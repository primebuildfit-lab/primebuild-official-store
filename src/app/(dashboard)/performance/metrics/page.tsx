import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { MetricsBoard } from "@/components/os/metrics-board";

export const metadata: Metadata = { title: "Métricas" };

/**
 * Métricas (PBOS-001 · ORDEN 24). Operational and commercial metrics with a
 * contract, computed only from real local sources. Sales/rotation/coverage/
 * margins/trends are never invented ("No medido"); warehouses and currencies are
 * never mixed; the warehouse filter re-scopes inventory metrics. Analytics stays
 * pending.
 */
export default function MetricsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Rendimiento"
        title="Métricas"
        description="Métricas con contrato y fuente, sin cifras inventadas."
        icon="trending-up"
      />

      <Panel className="mb-6" icon="shield" title="Cada métrica con contrato y fuente">
        <p className="text-sm text-muted">
          Toda métrica declara definición, fórmula, unidad, fuente y estado. Se calcula solo desde
          fuentes reales:{" "}
          <span className="font-medium text-foreground">
            ventas, rotación, cobertura, márgenes y tendencias no se inventan
          </span>{" "}
          y muestran &quot;No medido&quot; con su motivo. No se mezclan almacenes ni monedas. La
          arquitectura de Analytics sigue pendiente de decisión.
        </p>
      </Panel>

      <MetricsBoard />
    </div>
  );
}
