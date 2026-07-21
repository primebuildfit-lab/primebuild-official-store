import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { StoreSourceBadge } from "@/components/os/module-header";
import { OrdersInbox } from "@/components/os/orders-inbox";
import { loadStore } from "@/server/integrations/store/load";
import { listOrders } from "@/server/integrations/store/store.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pedidos" };

/**
 * Pedidos (PBOS-001 · ORDEN 19). The sales-order inbox. Shopify is a possible
 * external source; importing is idempotent into a local projection. The order,
 * payment, reservation, fulfillment, return and sync lifecycles are shown
 * separately; payment is observed only; reservation is blocked without a policy;
 * remote actions are blocked. No order is invented.
 */
export default async function OrdersPage() {
  const res = await loadStore(() => listOrders(50));
  const connected = res.connected && res.data != null;

  return (
    <div>
      <PageHeader
        eyebrow="Ventas"
        title="Pedidos"
        description="Bandeja de pedidos con Shopify como posible origen externo."
        icon="receipt"
      >
        <StoreSourceBadge connected={connected} error={res.error} />
      </PageHeader>

      <Panel className="mb-6" icon="shield" title="Estados separados, importación idempotente">
        <p className="text-sm text-muted">
          Los ciclos de{" "}
          <span className="font-medium text-foreground">
            pedido, pago, reserva, fulfillment, devolución y sincronización
          </span>{" "}
          se muestran por separado, nunca en uno solo. El estado de pago es{" "}
          <span className="font-medium text-foreground">observado</span> y no se cambia manualmente
          como verdad; importar un pedido de Shopify es idempotente; la reserva está bloqueada sin
          política; y no se cancela ni se hace fulfillment remoto.
        </p>
      </Panel>

      <OrdersInbox connected={connected} shopifyOrders={res.data ?? []} />
    </div>
  );
}
