import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { CountsBoard } from "@/components/os/counts-board";

export const metadata: Metadata = { title: "Conteos y ajustes" };

/**
 * Conteos y ajustes (PBOS-001 · ORDEN 14). Counting never modifies inventory;
 * only an approved adjustment does, by appending movements. A blind count
 * withholds the expected quantity at the data level; an applied adjustment is
 * immutable and corrected only via a compensating movement.
 */
export default function CountsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Inventario"
        title="Conteos y ajustes"
        description="Conteos físicos y ajustes auditados, sin editar el saldo."
        icon="clipboard-check"
      />

      <Panel className="mb-6" icon="shield" title="Contar no cambia el inventario">
        <p className="text-sm text-muted">
          Un conteo compara lo contado con lo esperado;{" "}
          <span className="font-medium text-foreground">contar no modifica el inventario</span>.
          Solo un ajuste aprobado lo hace, y lo hace creando movimientos append-only con motivo,
          actor y aprobación cuando la política lo exige. En un conteo ciego el esperado se oculta a
          nivel de datos (no con CSS). Un ajuste aplicado no se edita ni se borra: se corrige con un
          movimiento compensatorio. No se inventan costos.
        </p>
      </Panel>

      <CountsBoard />
    </div>
  );
}
