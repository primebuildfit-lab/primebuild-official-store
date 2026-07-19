import Link from "next/link";
import type { Metadata } from "next";
import {
  Badge,
  Card,
  Icon,
  KpiCard,
  PageHeader,
  Panel,
  StatusDot,
} from "@/components/ds";
import { StoreSourceBadge } from "@/components/os/module-header";
import { app } from "@/config/app";
import { SECTION_GROUPS, sectionsByGroup } from "@/config/sections";
import { loadStore } from "@/server/integrations/store/load";
import { storeOverview } from "@/server/integrations/store/store.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const res = await loadStore(() => storeOverview());
  const s = res.data;

  return (
    <div>
      <PageHeader
        eyebrow="Centro comercial"
        title={app.name}
        description={app.tagline + "."}
        icon="dashboard"
      >
        <StoreSourceBadge connected={res.connected} error={res.error} />
      </PageHeader>

      {/* Commercial hero — store identity + live connection, honest either way. */}
      <Card elevated className="core-accent-wash core-rise mb-6 overflow-hidden">
        <div className="core-grid flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-4">
            <span
              className="grid h-12 w-12 place-items-center rounded-2xl text-lg font-black text-white shadow-[var(--shadow-glow)]"
              style={{ background: "var(--gradient-accent)" }}
            >
              PB
            </span>
            <div>
              <p className="text-lg font-bold tracking-tight">
                {s ? s.shopName : "Tienda oficial PrimeBuild"}
              </p>
              <p className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                {s ? (
                  <>
                    <span className="font-mono">{s.domain}</span>
                    {s.planName ? <span className="text-faint">· Plan {s.planName}</span> : null}
                  </>
                ) : (
                  "Conecta el Admin API para ver la tienda en vivo (solo lectura)."
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1.5 text-xs backdrop-blur">
            <StatusDot tone={res.connected ? "ok" : "warn"} live={res.connected} />
            <span className="font-medium">
              {res.connected ? "Lectura en vivo activa" : "Tienda no conectada"}
            </span>
          </div>
        </div>
      </Card>

      {/* Live commercial snapshot — only real numbers; "—" when not connected. */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Productos" value={s ? String(s.productCount) : "—"} icon="box" hint="Catálogo publicado" />
        <KpiCard label="Clientes" value={s ? String(s.customerCount) : "—"} icon="users" hint="Compradores registrados" />
        <KpiCard
          label="Pedidos recientes"
          value={s ? String(s.recentOrderCount) : "—"}
          icon="receipt"
          hint={s ? "Últimos pedidos" : "Conecta la tienda"}
        />
        <KpiCard
          label="Ingresos recientes"
          value={s ? `${s.recentOrdersSubtotal}` : "—"}
          icon="trending-up"
          accent
          hint={s ? `${s.currency} · pedidos recientes` : "Conecta la tienda"}
        />
      </div>

      {/* Quick access, organised by commercial area. */}
      <div className="mb-3 flex items-center gap-2">
        <Icon name="sparkles" size={15} className="text-accent" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-faint">
          Áreas comerciales
        </p>
      </div>

      <div className="flex flex-col gap-7">
        {SECTION_GROUPS.map((group) => {
          const items = sectionsByGroup(group).filter((sec) => sec.id !== "dashboard");
          if (items.length === 0) return null;
          return (
            <section key={group}>
              <h2 className="mb-3 text-sm font-semibold text-muted">{group}</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((sec) => (
                  <Link key={sec.id} href={sec.href} className="group block">
                    <Card interactive className="core-rise flex h-full items-start gap-3 p-4">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-surface-muted text-accent transition-colors group-hover:border-border-strong">
                        <Icon name={sec.icon} size={18} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="flex items-center gap-1 text-sm font-semibold tracking-tight">
                          {sec.label}
                          <Icon
                            name="chevron-right"
                            size={14}
                            className="text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-muted"
                          />
                        </h3>
                        <p className="mt-0.5 text-xs text-muted">{sec.summary}</p>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Honest footer note — no fabricated activity feed. */}
      <Panel className="mt-8" icon="shield" title="Datos honestos, solo lectura">
        <p className="text-sm text-muted">
          Cada cifra proviene en vivo del Admin API de Shopify. PrimeBuild Official Store nunca
          escribe en la tienda y no inventa productos, pedidos ni ingresos: cuando la tienda no está
          conectada, verás{" "}
          <Badge kind="neutral" className="align-middle">
            —
          </Badge>{" "}
          en lugar de datos simulados.
        </p>
      </Panel>
    </div>
  );
}
