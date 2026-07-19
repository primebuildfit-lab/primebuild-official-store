import type { Metadata } from "next";
import { ModuleHeader, StoreSourceBadge } from "@/components/os/module-header";
import { Badge, DataTable, StoreNotConnected, type BadgeKind, type Column } from "@/components/ds";
import { loadStore } from "@/server/integrations/store/load";
import { listDiscounts, type StoreDiscount } from "@/server/integrations/store/store.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Descuentos · Store" };

const STATUS_KIND: Record<string, BadgeKind> = {
  ACTIVE: "healthy",
  SCHEDULED: "warning",
  EXPIRED: "neutral",
};

export default async function StoreDiscountsPage() {
  const res = await loadStore(() => listDiscounts(100));
  const rows = res.data ?? [];

  const columns: Column<StoreDiscount>[] = [
    { key: "title", header: "Descuento", render: (r) => <span className="font-medium">{r.title}</span> },
    { key: "method", header: "Tipo", render: (r) => r.method },
    { key: "kind", header: "Clase", render: (r) => <span className="text-xs text-muted">{r.type}</span> },
    {
      key: "status",
      header: "Estado",
      render: (r) => <Badge kind={STATUS_KIND[r.status] ?? "neutral"}>{r.status}</Badge>,
    },
    {
      key: "starts",
      header: "Inicio",
      render: (r) => (r.startsAt ? new Date(r.startsAt).toLocaleDateString("es") : "—"),
    },
    {
      key: "ends",
      header: "Fin",
      render: (r) => (r.endsAt ? new Date(r.endsAt).toLocaleDateString("es") : "—"),
    },
  ];

  return (
    <div>
      <ModuleHeader id="store-discounts">
        <StoreSourceBadge connected={res.connected} error={res.error} />
      </ModuleHeader>
      {!res.connected ? (
        <StoreNotConnected error={res.error} />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getKey={(r) => r.id}
          emptyMessage="La tienda no tiene códigos de descuento."
          caption={
            <>
              <span>Solo lectura · Admin API</span>
              <span className="tabular-nums">{rows.length} descuentos</span>
            </>
          }
        />
      )}
    </div>
  );
}
