import type { Metadata } from "next";
import { ModuleHeader, StoreSourceBadge } from "@/components/os/module-header";
import { Badge, DataTable, StoreNotConnected, type BadgeKind, type Column } from "@/components/ds";
import { loadStore } from "@/server/integrations/store/load";
import { listProducts, type StoreProduct } from "@/server/integrations/store/store.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Productos · Store" };

const STATUS_KIND: Record<string, BadgeKind> = {
  ACTIVE: "healthy",
  DRAFT: "warning",
  ARCHIVED: "neutral",
};

export default async function StoreProductsPage() {
  const res = await loadStore(() => listProducts(100));
  const rows = res.data ?? [];

  const columns: Column<StoreProduct>[] = [
    { key: "title", header: "Producto", render: (r) => <span className="font-medium">{r.title}</span> },
    {
      key: "status",
      header: "Estado",
      render: (r) => <Badge kind={STATUS_KIND[r.status] ?? "neutral"}>{r.status}</Badge>,
    },
    {
      key: "inv",
      header: "Inventario",
      align: "right",
      render: (r) => (r.totalInventory == null ? "—" : String(r.totalInventory)),
    },
    { key: "price", header: "Precio", align: "right", render: (r) => `${r.price} ${r.currency}` },
  ];

  return (
    <div>
      <ModuleHeader id="store-products">
        <StoreSourceBadge connected={res.connected} error={res.error} />
      </ModuleHeader>
      {!res.connected ? (
        <StoreNotConnected error={res.error} />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getKey={(r) => r.id}
          emptyMessage="La tienda no tiene productos publicados."
          caption={
            <>
              <span>Solo lectura · Admin API</span>
              <span className="tabular-nums">{rows.length} productos</span>
            </>
          }
        />
      )}
    </div>
  );
}
