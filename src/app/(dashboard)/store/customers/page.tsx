import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { CustomersBoard } from "@/components/os/customers-board";

export const metadata: Metadata = { title: "Clientes" };

/**
 * Clientes (PBOS-001 · ORDEN 22). A minimal customer projection to operate orders,
 * returns, fulfillment and support — not a CRM. Contact is masked, addresses are
 * withheld unless needed, internal notes are separate, and mass export is blocked
 * without a capability. Customers are projected only from real imported orders.
 */
export default function CustomersPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Ventas"
        title="Clientes"
        description="Proyección mínima para operar pedidos, devoluciones y soporte."
        icon="users"
      />

      <Panel className="mb-6" icon="shield" title="Minimización, no un CRM">
        <p className="text-sm text-muted">
          Solo la proyección necesaria para operar: contactos{" "}
          <span className="font-medium text-foreground">enmascarados</span>, direcciones ocultas
          salvo operación autorizada, notas internas separadas, sin datos personales en logs y{" "}
          <span className="font-medium text-foreground">exportación masiva bloqueada</span> sin
          capacidad. No se inventa segmentación ni se escriben preferencias en Shopify sin contrato.
        </p>
      </Panel>

      <CustomersBoard />
    </div>
  );
}
