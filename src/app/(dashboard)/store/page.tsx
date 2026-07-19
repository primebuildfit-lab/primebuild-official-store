import type { Metadata } from "next";
import Link from "next/link";
import { Card, Icon, KpiCard, Panel, StoreNotConnected } from "@/components/ds";
import { ModuleHeader, StoreSourceBadge } from "@/components/os/module-header";
import { loadStore } from "@/server/integrations/store/load";
import { storeOverview } from "@/server/integrations/store/store.service";
import { getSection, type Section } from "@/config/sections";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Official Store" };

const SUBPAGE_IDS = [
  "store-products",
  "store-collections",
  "store-orders",
  "store-customers",
  "store-discounts",
  "store-rewards",
] as const;

function DefRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/50 py-1.5 last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

export default async function StorePage() {
  const res = await loadStore(() => storeOverview());
  const s = res.data;
  const subpages = SUBPAGE_IDS.map(getSection).filter(Boolean) as Section[];

  return (
    <div>
      <ModuleHeader id="store">
        <StoreSourceBadge connected={res.connected} error={res.error} />
      </ModuleHeader>

      {!res.connected || !s ? (
        <StoreNotConnected error={res.error} />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Productos" value={String(s.productCount)} icon="box" hint="Publicados" />
            <KpiCard label="Clientes" value={String(s.customerCount)} icon="users" />
            <KpiCard
              label="Pedidos recientes"
              value={String(s.recentOrderCount)}
              icon="receipt"
              hint={`${s.recentOrdersSubtotal} ${s.currency}`}
            />
            <KpiCard label="Plan" value={s.planName ?? "—"} icon="sparkles" accent hint={s.currency} />
          </div>

          <Panel className="mb-6" icon="store" title="Tienda oficial" description="Leída en vivo del Admin API de Shopify · solo lectura">
            <dl className="grid gap-x-8 text-sm sm:grid-cols-2">
              <DefRow label="Nombre">{s.shopName}</DefRow>
              <DefRow label="Dominio">
                <span className="font-mono text-xs">{s.domain}</span>
              </DefRow>
              <DefRow label="URL pública">
                {s.primaryUrl ? <span className="font-mono text-xs">{s.primaryUrl}</span> : "—"}
              </DefRow>
              <DefRow label="Moneda">{s.currency}</DefRow>
            </dl>
            <p className="mt-3 text-xs text-faint">
              PrimeBuild Official Store nunca escribe en la tienda.
            </p>
          </Panel>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {subpages.map((p) => (
              <Link key={p.id} href={p.href} className="group block">
                <Card interactive className="flex h-full items-center gap-3 p-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-surface-muted text-accent">
                    <Icon name={p.icon} size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{p.label}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">{p.summary}</p>
                  </div>
                  <Icon
                    name="chevron-right"
                    size={16}
                    className="ml-auto text-faint transition-transform group-hover:translate-x-0.5"
                  />
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
