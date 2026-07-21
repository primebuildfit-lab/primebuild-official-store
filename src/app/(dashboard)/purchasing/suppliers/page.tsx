import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { SuppliersBoard } from "@/components/os/suppliers-board";

export const metadata: Metadata = { title: "Proveedores" };

/**
 * Proveedores (PBOS-001 · ORDEN 8). The operational supplier registry. Suppliers
 * are only what the operator registers — none are pre-created from historical
 * mentions. Manual entries persist locally and start unverified; supplier-product
 * catalogs need a connected source and stay honestly empty.
 */
export default function SuppliersPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Compras"
        title="Proveedores"
        description="Registro operativo de proveedores reales y sus condiciones."
        icon="truck"
      />

      <Panel className="mb-6" icon="shield" title="Una mención no es una integración">
        <p className="text-sm text-muted">
          No se precrean proveedores (AliExpress, Amazon u otros) por aparecer en documentación:
          solo existen los que se registran realmente. Cada proveedor indica cómo llegaron sus datos
          (manual, registrado, importado o conectado) y si está verificado —{" "}
          <span className="font-medium text-foreground">sin verificar</span> hasta que haya
          evidencia. Los datos recibidos del proveedor no se editan sin un contrato explícito.
        </p>
      </Panel>

      <SuppliersBoard />
    </div>
  );
}
