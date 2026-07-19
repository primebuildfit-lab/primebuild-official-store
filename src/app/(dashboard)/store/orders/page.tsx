import type { Metadata } from "next";
import { ModuleHeader, StoreSourceBadge } from "@/components/os/module-header";
import { Badge, DataTable, StoreNotConnected, type BadgeKind, type Column } from "@/components/ds";
import { loadStore } from "@/server/integrations/store/load";
import { listOrders, type StoreOrder } from "@/server/integrations/store/store.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pedidos · Store" };

const FIN_KIND: Record<string, BadgeKind> = {
  PAID: "healthy",
  PARTIALLY_PAID: "warning",
  PENDING: "warning",
  REFUNDED: "neutral",
  VOIDED: "critical",
  PARTIALLY_REFUNDED: "warning",
};

const FULFIL_KIND: Record<string, BadgeKind> = {
  FULFILLED: "healthy",
  PARTIALLY_FULFILLED: "warning",
  UNFULFILLED: "warning",
  RESTOCKED: "neutral",
};

export default async function StoreOrdersPage() {
  const res = await loadStore(() => listOrders(50));
  const rows = res.data ?? [];

  const columns: Column<StoreOrder>[] = [
    { key: "name", header: "Pedido", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "customer", header: "Cliente", render: (r) => r.customer ?? "—" },
    { key: "date", header: "Fecha", render: (r) => new Date(r.createdAt).toLocaleString("es") },
    {
      key: "fin",
      header: "Pago",
      render: (r) =>
        r.financialStatus ? (
          <Badge kind={FIN_KIND[r.financialStatus] ?? "neutral"}>{r.financialStatus}</Badge>
        ) : (
          "—"
        ),
    },
    {
      key: "ful",
      header: "Cumplimiento",
      render: (r) =>
        r.fulfillmentStatus ? (
          <Badge kind={FULFIL_KIND[r.fulfillmentStatus] ?? "neutral"}>{r.fulfillmentStatus}</Badge>
        ) : (
          "—"
        ),
    },
    { key: "total", header: "Total", align: "right", render: (r) => `${r.total} ${r.currency}` },
  ];

  return (
    <div>
      <ModuleHeader id="store-orders">
        <StoreSourceBadge connected={res.connected} error={res.error} />
      </ModuleHeader>
      {!res.connected ? (
        <StoreNotConnected error={res.error} />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getKey={(r) => r.id}
          emptyMessage="La tienda no tiene pedidos recientes."
          caption={
            <>
              <span>Solo lectura · Admin API</span>
              <span className="tabular-nums">{rows.length} pedidos recientes</span>
            </>
          }
        />
      )}
    </div>
  );
}
