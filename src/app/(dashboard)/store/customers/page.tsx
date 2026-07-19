import type { Metadata } from "next";
import { ModuleHeader, StoreSourceBadge } from "@/components/os/module-header";
import { DataTable, StoreNotConnected, type Column } from "@/components/ds";
import { loadStore } from "@/server/integrations/store/load";
import { listCustomers, type StoreCustomer } from "@/server/integrations/store/store.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Clientes · Store" };

export default async function StoreCustomersPage() {
  const res = await loadStore(() => listCustomers(50));
  const rows = res.data ?? [];

  const columns: Column<StoreCustomer>[] = [
    { key: "name", header: "Cliente", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "email", header: "Email", render: (r) => (r.email ? <span className="font-mono text-xs text-muted">{r.email}</span> : "—") },
    { key: "orders", header: "Pedidos", align: "right", render: (r) => String(r.ordersCount) },
    { key: "spent", header: "Gasto total", align: "right", render: (r) => `${r.amountSpent} ${r.currency}` },
  ];

  return (
    <div>
      <ModuleHeader id="store-customers">
        <StoreSourceBadge connected={res.connected} error={res.error} />
      </ModuleHeader>
      {!res.connected ? (
        <StoreNotConnected error={res.error} />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getKey={(r) => r.id}
          emptyMessage="La tienda no tiene clientes todavía."
          caption={
            <>
              <span>Solo lectura · Admin API</span>
              <span className="tabular-nums">{rows.length} clientes</span>
            </>
          }
        />
      )}
    </div>
  );
}
