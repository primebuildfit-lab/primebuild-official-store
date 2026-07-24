"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  DataTable,
  DetailDrawer,
  FilterBar,
  SegmentedControl,
  type Column,
  type TabOption,
} from "@/components/ds";
import { useVersionedCollection, useLocalCollection, useLedger } from "@/lib/local-collection";
import { INVENTORY_SCHEMA_VERSION, isMovement, type InventoryMovement } from "@/lib/inventory";
import type { PurchaseOrder } from "@/lib/purchase-orders";
import { TRANSFER_SCHEMA_VERSION, isTransfer, type Transfer } from "@/lib/transfers";
import { RETURNS_SCHEMA_VERSION, isReturn, type SalesReturn } from "@/lib/returns";
import { FULFILLMENT_SCHEMA_VERSION, isFulfillment, type Fulfillment } from "@/lib/fulfillment";
import { STORE_DEF_SCHEMA_VERSION } from "@/lib/store-definition";
import { AUTOMATIONS_SCHEMA_VERSION, isRule, type Rule } from "@/lib/automations";
import { ORDERS_SCHEMA_VERSION, isSalesOrder, type SalesOrderProjection } from "@/lib/orders";
import {
  CATEGORY_LABEL,
  canExportAudit,
  toAuditEvent,
  type AuditCategory,
  type AuditEvent,
} from "@/lib/audit";

/**
 * Auditoría (PBOS-001 · ORDEN 27). A readable audit built from REAL events already
 * recorded across the local spaces. Text is masked; failures are included; export
 * is capability-gated. Nothing is fabricated.
 */

const isRevision = (x: unknown): x is { id: string; number: number; at: string; reason: string } =>
  x !== null && typeof x === "object" && typeof (x as { id?: unknown }).id === "string";

const VIEWS: TabOption[] = [
  { value: "todo", label: "Todo" },
  { value: "compras", label: "Compras" },
  { value: "inventario", label: "Inventario" },
  { value: "pedidos", label: "Pedidos" },
  { value: "fulfillment", label: "Fulfillment" },
  { value: "devoluciones", label: "Devoluciones" },
  { value: "configuracion", label: "Configuración" },
  { value: "seguridad", label: "Seguridad" },
  { value: "fallos", label: "Fallos" },
];

export function AuditBoard() {
  const ledger = useLedger<InventoryMovement>(
    "inventory:movements",
    INVENTORY_SCHEMA_VERSION,
    isMovement,
  );
  const pos = useLocalCollection<PurchaseOrder>("po:list");
  const transfers = useVersionedCollection<Transfer>(
    "inventory:transfers",
    TRANSFER_SCHEMA_VERSION,
    isTransfer,
  );
  const returns = useVersionedCollection<SalesReturn>(
    "returns:list",
    RETURNS_SCHEMA_VERSION,
    isReturn,
  );
  const fulfillments = useVersionedCollection<Fulfillment>(
    "fulfillment:list",
    FULFILLMENT_SCHEMA_VERSION,
    isFulfillment,
  );
  const revisions = useVersionedCollection<{
    id: string;
    number: number;
    at: string;
    reason: string;
  }>("store:revisions", STORE_DEF_SCHEMA_VERSION, isRevision);
  const rules = useVersionedCollection<Rule>(
    "automations:rules",
    AUTOMATIONS_SCHEMA_VERSION,
    isRule,
  );
  const orders = useVersionedCollection<SalesOrderProjection>(
    "orders:projections",
    ORDERS_SCHEMA_VERSION,
    isSalesOrder,
  );

  const [view, setView] = useState("todo");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<AuditEvent | null>(null);

  const events = useMemo(() => {
    const out: AuditEvent[] = [];
    for (const m of ledger.entries)
      out.push(
        toAuditEvent({
          id: m.id,
          at: m.occurredAt,
          actor: m.actor,
          action: m.movementType,
          entity: m.sku ?? "—",
          category: "inventario",
          source: "ledger",
          result: m.status,
          correlationId: m.correlationId,
          reason: m.reason,
        }),
      );
    for (const po of pos.items)
      po.history.forEach((h, i) =>
        out.push(
          toAuditEvent({
            id: `${po.id}-${i}`,
            at: h.at,
            actor: h.actor,
            action: h.from ? `${h.from} → ${h.to}` : h.to,
            entity: po.number,
            category: "compras",
            source: "oc",
            reason: h.reason,
          }),
        ),
      );
    for (const t of transfers.items)
      t.history.forEach((h, i) =>
        out.push(
          toAuditEvent({
            id: `${t.id}-${i}`,
            at: h.at,
            actor: h.actor,
            action: h.from ? `${h.from} → ${h.to}` : h.to,
            entity: t.code,
            category: "inventario",
            source: "transferencia",
            reason: h.reason,
          }),
        ),
      );
    for (const r of returns.items)
      r.history.forEach((h, i) =>
        out.push(
          toAuditEvent({
            id: `${r.id}-${i}`,
            at: h.at,
            actor: h.actor,
            action: h.from ? `${h.from} → ${h.to}` : h.to,
            entity: r.code,
            category: "devoluciones",
            source: "devolucion",
            reason: h.reason,
          }),
        ),
      );
    for (const f of fulfillments.items)
      f.history.forEach((h, i) =>
        out.push(
          toAuditEvent({
            id: `${f.id}-${i}`,
            at: h.at,
            actor: h.actor,
            action: h.from ? `${h.from} → ${h.to}` : h.to,
            entity: f.code,
            category: "fulfillment",
            source: "fulfillment",
            reason: h.reason,
          }),
        ),
      );
    for (const rev of revisions.items)
      out.push(
        toAuditEvent({
          id: rev.id,
          at: rev.at,
          actor: "operador-local",
          action: rev.reason,
          entity: `StoreDefinition #${rev.number}`,
          category: "configuracion",
          source: "store-def",
        }),
      );
    for (const rule of rules.items)
      rule.history.forEach((h, i) =>
        out.push(
          toAuditEvent({
            id: `${rule.id}-${i}`,
            at: h.at,
            actor: h.actor,
            action: h.action,
            entity: rule.name,
            category: "seguridad",
            source: "automatizacion",
          }),
        ),
      );
    for (const o of orders.items)
      o.history.forEach((h, i) =>
        out.push(
          toAuditEvent({
            id: `${o.id}-${i}`,
            at: h.at,
            actor: h.actor,
            action: h.action,
            entity: o.name,
            category: "pedidos",
            source: "pedido",
          }),
        ),
      );
    return out.sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [
    ledger.entries,
    pos.items,
    transfers.items,
    returns.items,
    fulfillments.items,
    revisions.items,
    rules.items,
    orders.items,
  ]);

  const rows = useMemo(() => {
    let r = events;
    if (view === "fallos") r = r.filter((e) => e.result !== "ok" && e.result !== "publicado");
    else if (view !== "todo") r = r.filter((e) => e.category === (view as AuditCategory));
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      r = r.filter((e) => `${e.actor} ${e.action} ${e.entity}`.toLowerCase().includes(s));
    }
    return r;
  }, [events, view, q]);

  const columns: Column<AuditEvent>[] = [
    {
      key: "at",
      header: "Fecha",
      render: (e) => (
        <span className="text-xs tabular-nums text-faint">
          {new Date(e.at).toLocaleString("es")}
        </span>
      ),
    },
    {
      key: "cat",
      header: "Categoría",
      render: (e) => <Badge kind="neutral">{CATEGORY_LABEL[e.category]}</Badge>,
    },
    {
      key: "action",
      header: "Acción",
      render: (e) => <span className="font-medium">{e.action}</span>,
    },
    {
      key: "entity",
      header: "Entidad",
      render: (e) => <span className="font-mono text-xs">{e.entity}</span>,
    },
    { key: "actor", header: "Actor", render: (e) => <span className="text-muted">{e.actor}</span> },
    {
      key: "open",
      header: "",
      align: "right",
      render: (e) => (
        <button
          type="button"
          onClick={() => setSelected(e)}
          className="text-xs text-muted hover:text-foreground"
        >
          Ver
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <FilterBar
          search={q}
          onSearch={setQ}
          searchPlaceholder="Buscar actor, acción o entidad…"
          onClear={q ? () => setQ("") : undefined}
        />
        <button
          type="button"
          disabled
          title={canExportAudit(false).reason}
          className="cursor-not-allowed rounded-lg border border-border px-2.5 py-1.5 text-xs text-faint opacity-60"
        >
          Exportar auditoría
        </button>
      </div>

      <SegmentedControl
        options={VIEWS}
        value={view}
        onChange={setView}
        className="mb-4 flex-wrap"
      />

      <DataTable
        columns={columns}
        rows={rows}
        getKey={(e) => e.id}
        emptyMessage="Sin eventos de auditoría en esta vista."
        caption={
          <>
            <span>Eventos reales de las colecciones locales · texto enmascarado</span>
            <span className="tabular-nums">{rows.length}</span>
          </>
        }
      />

      {selected ? (
        <DetailDrawer
          open
          onClose={() => setSelected(null)}
          title={selected.action}
          description={CATEGORY_LABEL[selected.category]}
        >
          <dl className="grid grid-cols-1 gap-2 text-sm">
            <Row k="Resumen" v={`${selected.action} · ${selected.entity}`} />
            <Row k="Actor" v={selected.actor} />
            <Row k="Fecha" v={new Date(selected.at).toLocaleString("es")} />
            <Row k="Entidad" v={selected.entity} />
            <Row k="Resultado" v={selected.result} />
            <Row k="Fuente" v={selected.source} />
            {selected.correlationId ? <Row k="Correlation" v={selected.correlationId} /> : null}
            {selected.reason ? <Row k="Motivo" v={selected.reason} /> : null}
          </dl>
          <p className="mt-3 text-[0.66rem] text-faint">
            Resumen legible (no solo JSON). Datos personales, tokens y secretos enmascarados. Los
            fallos y las acciones bloqueadas también se auditan.
          </p>
        </DetailDrawer>
      ) : null}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/50 py-1.5 last:border-0">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}
