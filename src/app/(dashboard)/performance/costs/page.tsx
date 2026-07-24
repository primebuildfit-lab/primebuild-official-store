import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { CostsBoard } from "@/components/os/costs-board";

export const metadata: Metadata = { title: "Costos y márgenes" };

/**
 * Costos y márgenes (PBOS-001 · ORDEN 23). Transparent formulas over real
 * purchase-order costs. Landed cost is always "estimado" while components are
 * missing (never "confirmado"); margins read "Fuente incompleta" (never 0) when
 * price or a linking SKU is absent; currencies are never mixed or converted.
 * CoinOS balances are never touched.
 */
export default function CostsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Rendimiento"
        title="Costos y márgenes"
        description="Fórmulas transparentes sobre costos reales de compra."
        icon="dollar"
      />

      <Panel className="mb-6" icon="shield" title="Cada cálculo dice su fórmula y su estado">
        <p className="text-sm text-muted">
          Los costos vienen de{" "}
          <span className="font-medium text-foreground">órdenes de compra reales</span>. El landed
          cost es <span className="font-medium text-foreground">estimado</span> mientras falten
          componentes (nunca &quot;confirmado&quot;); el margen se muestra{" "}
          <span className="font-medium text-foreground">Fuente incompleta</span> — nunca cero —
          cuando falta el precio o el enlace por SKU. No se mezclan ni convierten monedas, y no se
          editan balances de CoinOS.
        </p>
      </Panel>

      <CostsBoard />
    </div>
  );
}
