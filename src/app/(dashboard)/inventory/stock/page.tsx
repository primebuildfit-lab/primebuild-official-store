import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { InventoryBoard } from "@/components/os/inventory-board";

export const metadata: Metadata = { title: "Existencias" };

/**
 * Existencias (PBOS-001 · ORDEN 11). The canonical stock view, derived from a
 * local append-only movement ledger. There is no editable total; damaged and
 * quarantined stock never count as available; the Available formula is undefined
 * until a policy exists. Closed receipts can be posted here (Workspace local,
 * idempotent) and it never touches Shopify or remote inventory.
 */
export default function StockPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Inventario"
        title="Existencias"
        description="Saldo canónico derivado de movimientos, por SKU y almacén."
        icon="package"
      />

      <Panel className="mb-6" icon="shield" title="Saldo derivado, nunca editado">
        <p className="text-sm text-muted">
          El inventario se deriva de un{" "}
          <span className="font-medium text-foreground">
            ledger local de movimientos append-only
          </span>
          : no existe un total editable. La cantidad de Shopify no es el físico local; una recepción
          no es inventario hasta contabilizarse. Dañado y cuarentena no cuentan como disponibles, y{" "}
          <span className="font-medium text-foreground">Available</span> se muestra como
          &quot;Fórmula no definida&quot; hasta que exista una política — nunca un cero inventado.
        </p>
      </Panel>

      <InventoryBoard />
    </div>
  );
}
