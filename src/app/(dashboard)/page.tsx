import Link from "next/link";
import type { Metadata } from "next";
import {
  ActivityTimeline,
  Card,
  ConnectionState,
  ExternalLinkAction,
  Icon,
  type IconName,
  MetricCard,
  MoneyValue,
  PageHeader,
  Panel,
} from "@/components/ds";
import { AttentionList, type AttentionItem } from "@/components/os/attention-list";
import { StoreSourceBadge } from "@/components/os/module-header";
import { app } from "@/config/app";
import { loadStore } from "@/server/integrations/store/load";
import { storeOverview } from "@/server/integrations/store/store.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Resumen" };

/** Prepared quick actions. Each links to a real (built or prepared) route. */
const QUICK_ACTIONS: { label: string; href: string; icon: IconName }[] = [
  { label: "Crear compra rápida", href: "/purchasing/quick-buy", icon: "bolt" },
  { label: "Añadir producto", href: "/store/products", icon: "box" },
  { label: "Añadir proveedor", href: "/purchasing/suppliers", icon: "truck" },
  { label: "Iniciar recepción", href: "/purchasing/receiving", icon: "inbox" },
  { label: "Crear transferencia", href: "/inventory/transfers", icon: "transfer" },
  { label: "Revisar Shopify", href: "/control/integrations", icon: "plug" },
];

export default async function ResumenPage() {
  const res = await loadStore(() => storeOverview());
  const s = res.data;

  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat("es", { dateStyle: "long", timeStyle: "short" }).format(
    now,
  );
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // "Requiere atención" — only real signals. Operational sources (purchases,
  // inventory, receiving, orders) are not connected yet, so they add nothing;
  // the honest empty note explains that. We never fabricate an alert.
  const attention: AttentionItem[] = [];
  if (res.error) {
    attention.push({
      id: "store-error",
      severity: "warning",
      title: "No se pudo leer la tienda oficial",
      detail: res.error,
      source: "Shopify",
      href: "/status",
      actionLabel: "Ver estado",
    });
  } else if (!res.connected) {
    attention.push({
      id: "store-not-connected",
      severity: "info",
      title: "Tienda oficial no conectada",
      detail: "Conéctala para leer catálogo, pedidos y clientes en vivo (solo lectura).",
      source: "Official Store",
      href: "/settings",
      actionLabel: "Configurar",
    });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Inicio"
        title="Resumen"
        description="El estado del comercio, hoy."
        icon="dashboard"
      >
        <StoreSourceBadge connected={res.connected} error={res.error} />
      </PageHeader>

      {/* Header context + primary action */}
      <Card className="core-rise mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex flex-col gap-1 text-sm">
            <p className="font-semibold">{app.name}</p>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
              <span className="tabular-nums">{dateLabel}</span>
              <span className="text-faint">· {tz}</span>
              <span className="text-faint">· Almacén: Todos</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExternalLinkAction
              href={s?.primaryUrl}
              system="la tienda pública"
              disabledReason="Conecta la tienda para abrir su URL pública verificada."
            >
              Abrir tienda pública
            </ExternalLinkAction>
            <Link
              href="/purchasing/quick-buy"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Icon name="bolt" size={15} />
              Crear compra rápida
            </Link>
          </div>
        </div>
      </Card>

      {/* Requiere atención */}
      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted">
          <Icon name="alert" size={15} className="text-warn" />
          Requiere atención
        </h2>
        <AttentionList
          items={attention}
          emptyNote="Las fuentes operativas (compras, inventario, recepciones, pedidos) se conectan orden por orden. Cuando existan datos reales, lo pendiente aparecerá aquí — no se inventan alertas."
        />
      </section>

      {/* Ventas y pedidos — real Shopify numbers only, else honest connection state */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-muted">Ventas y pedidos</h2>
        {s ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Productos"
              value={String(s.productCount)}
              icon="box"
              source="Fuente: Shopify (solo lectura)"
            />
            <MetricCard
              label="Clientes"
              value={String(s.customerCount)}
              icon="users"
              source="Fuente: Shopify (solo lectura)"
            />
            <MetricCard
              label="Pedidos recientes"
              value={String(s.recentOrderCount)}
              icon="receipt"
              source="Últimos 50 · Shopify"
            />
            <MetricCard
              label="Ingresos recientes"
              value={<MoneyValue amount={Number(s.recentOrdersSubtotal)} currency={s.currency} />}
              icon="trending-up"
              source={`${s.currency} · pedidos recientes · Shopify`}
            />
          </div>
        ) : (
          <ConnectionState
            source="La tienda oficial (Shopify)"
            needed={
              <>
                Configura las credenciales del Admin API en Ajustes para leer productos, clientes y
                pedidos en vivo.{" "}
                <Link href="/settings" className="text-accent hover:underline">
                  Ir a Configuración
                </Link>
                .
              </>
            }
          />
        )}
      </section>

      {/* Inventario y compras — sources not built yet; honest "No medido", never 0 */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted">Inventario</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard
              label="Disponible"
              icon="package"
              source="Requiere Inventario · PBOS-INVENTORY-001"
            />
            <MetricCard
              label="Incoming"
              icon="inbox"
              source="Requiere Compras · PBOS-INVENTORY-001"
            />
            <MetricCard
              label="Comprometido"
              icon="receipt"
              source="Requiere Inventario · PBOS-INVENTORY-001"
            />
            <MetricCard
              label="En cuarentena"
              icon="shield"
              source="Requiere Inventario · PBOS-INVENTORY-001"
            />
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted">Compras</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard
              label="Borradores"
              icon="clipboard"
              source="Requiere Compras · PBOS-QUICK-BUY-001"
            />
            <MetricCard
              label="Pendientes de aprobación"
              icon="clipboard-check"
              source="Requiere Compras · PBOS-PURCHASE-ORDERS-001"
            />
            <MetricCard
              label="Órdenes abiertas"
              icon="clipboard"
              source="Requiere Compras · PBOS-PURCHASE-ORDERS-001"
            />
            <MetricCard
              label="Valor incoming"
              icon="truck"
              source="Requiere Compras · PBOS-RECEIVING-001"
            />
          </div>
        </section>
      </div>

      {/* Quick actions + recent activity */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted">Acciones rápidas</h2>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {QUICK_ACTIONS.map((a) => (
              <Link key={a.href} href={a.href} className="group">
                <Card interactive className="flex items-center gap-3 p-3.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-surface-muted text-accent transition-colors group-hover:border-border-strong">
                    <Icon name={a.icon} size={16} />
                  </span>
                  <span className="text-sm font-medium">{a.label}</span>
                  <Icon
                    name="chevron-right"
                    size={14}
                    className="ml-auto text-faint transition-transform group-hover:translate-x-0.5"
                  />
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted">Actividad reciente</h2>
          <ActivityTimeline events={[]} emptyMessage="Sin actividad registrada todavía." />
        </section>
      </div>

      <Panel className="mt-8" icon="shield" title="Datos honestos, solo lectura">
        <p className="text-sm text-muted">
          Cada cifra proviene de una fuente real. Las superficies de Shopify son de solo lectura;
          los espacios operativos se construyen orden por orden y, hasta entonces, muestran{" "}
          <span className="font-medium text-foreground">No medido</span> en vez de un cero
          inventado.
        </p>
      </Panel>
    </div>
  );
}
