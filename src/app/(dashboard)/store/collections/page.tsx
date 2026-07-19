import type { Metadata } from "next";
import { ModuleHeader, StoreSourceBadge } from "@/components/os/module-header";
import { DataTable, StoreNotConnected, type Column } from "@/components/ds";
import { loadStore } from "@/server/integrations/store/load";
import { listCollections, type StoreCollection } from "@/server/integrations/store/store.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Colecciones · Store" };

export default async function StoreCollectionsPage() {
  const res = await loadStore(() => listCollections(100));
  const rows = res.data ?? [];

  const columns: Column<StoreCollection>[] = [
    { key: "title", header: "Colección", render: (r) => <span className="font-medium">{r.title}</span> },
    { key: "handle", header: "Handle", render: (r) => <span className="font-mono text-xs text-muted">{r.handle}</span> },
    {
      key: "products",
      header: "Productos",
      align: "right",
      render: (r) => (r.productsCount == null ? "—" : String(r.productsCount)),
    },
    {
      key: "updated",
      header: "Actualizada",
      render: (r) => new Date(r.updatedAt).toLocaleDateString("es"),
    },
  ];

  return (
    <div>
      <ModuleHeader id="store-collections">
        <StoreSourceBadge connected={res.connected} error={res.error} />
      </ModuleHeader>
      {!res.connected ? (
        <StoreNotConnected error={res.error} />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getKey={(r) => r.id}
          emptyMessage="La tienda no tiene colecciones."
          caption={
            <>
              <span>Solo lectura · Admin API</span>
              <span className="tabular-nums">{rows.length} colecciones</span>
            </>
          }
        />
      )}
    </div>
  );
}
