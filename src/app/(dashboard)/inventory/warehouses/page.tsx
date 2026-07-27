import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { WarehousesBoard } from "@/components/os/warehouses-board";

export const metadata: Metadata = { title: "Almacenes y ubicaciones" };

/**
 * Almacenes y ubicaciones (PBOS-001 · ORDEN 12). Operator-defined warehouses and
 * a flexible location hierarchy. No fictional warehouse is seeded; codes are
 * unique, the hierarchy cannot cycle, quarantine/damaged locations are not
 * sellable, and warehouses/locations with movements cannot be deleted. Shopify
 * mapping only appears with evidence.
 */
export default function WarehousesPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Inventario"
        title="Almacenes y ubicaciones"
        description="Estructura física del inventario, de lo simple a lo detallado."
        icon="warehouse"
      />

      <Panel className="mb-6" icon="shield" title="Estructura flexible, sin ficciones">
        <p className="text-sm text-muted">
          Puedes trabajar con{" "}
          <span className="font-medium text-foreground">Almacén → Ubicación</span> o crecer hasta
          Zona → Pasillo → Rack → Nivel → Bin. Los códigos son únicos por almacén y la jerarquía no
          puede formar ciclos. Cuarentena y dañados no son vendibles, y una ubicación virtual se
          marca como no física. Mover cantidades se hace por transferencia o ajuste; no se edita la
          ubicación directamente. El mapeo con Shopify solo aparece con evidencia real.
        </p>
      </Panel>

      <WarehousesBoard />
    </div>
  );
}
