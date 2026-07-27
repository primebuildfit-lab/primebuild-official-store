"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Badge,
  DataTable,
  DetailDrawer,
  HonestState,
  SegmentedControl,
  StatusBadge,
  type Column,
  type TabOption,
} from "@/components/ds";
import { useVersionedCollection, useLedger, localId } from "@/lib/local-collection";
import { INVENTORY_SCHEMA_VERSION, isMovement, type InventoryMovement } from "@/lib/inventory";
import { isWarehouse, WAREHOUSE_SCHEMA_VERSION, type Warehouse } from "@/lib/warehouses";
import { ORDERS_SCHEMA_VERSION, isSalesOrder, type SalesOrderProjection } from "@/lib/orders";
import {
  RETURNS_SCHEMA_VERSION,
  RETURN_DESTINATIONS,
  RETURN_TRANSITIONS,
  buildReturnMovements,
  inspectionComplete,
  isReturn,
  returnStatusLabel,
  type ReturnDestination,
  type ReturnLine,
  type ReturnStatus,
  type SalesReturn,
} from "@/lib/returns";

/**
 * Devoluciones (PBOS-001 · ORDEN 21). Five separate planes: physical return,
 * inspection, inventory destination, financial decision, observed refund. Goods
 * are never reintegrated to available before inspection; posting a destination to
 * stock uses the append-only ledger (idempotent); refund is observed only.
 */

const VIEWS: TabOption[] = [
  { value: "todas", label: "Todas" },
  { value: "solicitada", label: "Solicitadas" },
  { value: "pendiente-autorizacion", label: "Pendientes de autorización" },
  { value: "autorizada", label: "Autorizadas" },
  { value: "en-transito", label: "En tránsito" },
  { value: "recibida", label: "Recibidas" },
  { value: "en-revision", label: "En revisión" },
  { value: "pendiente-reembolso", label: "Pendientes de reembolso" },
  { value: "cerrada", label: "Cerradas" },
  { value: "rechazada", label: "Rechazadas" },
];

const TONE: Record<ReturnStatus, Parameters<typeof StatusBadge>[0]["tone"]> = {
  solicitada: "neutral",
  "pendiente-autorizacion": "progress",
  autorizada: "info",
  "en-transito": "progress",
  recibida: "progress",
  "pendiente-inspeccion": "warning",
  "en-revision": "warning",
  "pendiente-reembolso": "warning",
  cerrada: "positive",
  rechazada: "neutral",
};

export function ReturnsBoard() {
  const orders = useVersionedCollection<SalesOrderProjection>(
    "orders:projections",
    ORDERS_SCHEMA_VERSION,
    isSalesOrder,
  );
  const warehouses = useVersionedCollection<Warehouse>(
    "inventory:warehouses",
    WAREHOUSE_SCHEMA_VERSION,
    isWarehouse,
  );
  const returns = useVersionedCollection<SalesReturn>(
    "returns:list",
    RETURNS_SCHEMA_VERSION,
    isReturn,
  );
  const ledger = useLedger<InventoryMovement>(
    "inventory:movements",
    INVENTORY_SCHEMA_VERSION,
    isMovement,
  );

  const [view, setView] = useState("todas");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("");

  const selected = returns.items.find((r) => r.id === selectedId) ?? null;

  function create() {
    const order = orders.items.find((o) => o.id === orderId);
    if (!order || !reason.trim()) return;
    const now = new Date().toISOString();
    returns.add({
      id: localId(),
      code: `DEV-${String(returns.items.length + 1).padStart(4, "0")}`,
      orderId: order.id,
      orderExternalId: order.externalId,
      source: order.source,
      reason: reason.trim(),
      lines: [],
      status: "solicitada",
      refund: {},
      actor: "operador-local",
      createdAt: now,
      history: [
        {
          at: now,
          actor: "operador-local",
          from: null,
          to: "solicitada",
          reason: "Devolución creada",
        },
      ],
      posted: false,
      version: RETURNS_SCHEMA_VERSION,
    });
    setOrderId("");
    setReason("");
  }

  const rows = useMemo(
    () => (view === "todas" ? returns.items : returns.items.filter((r) => r.status === view)),
    [returns.items, view],
  );

  const columns: Column<SalesReturn>[] = [
    {
      key: "code",
      header: "Devolución",
      render: (r) => <span className="font-mono text-xs">{r.code}</span>,
    },
    {
      key: "order",
      header: "Pedido",
      render: (r) => <span className="text-muted">{r.orderExternalId.split("/").pop()}</span>,
    },
    {
      key: "status",
      header: "Estado",
      render: (r) => <StatusBadge label={returnStatusLabel(r.status)} tone={TONE[r.status]} />,
    },
    {
      key: "refund",
      header: "Reembolso",
      render: (r) =>
        r.refund.status ? (
          <Badge kind="neutral">{r.refund.status}</Badge>
        ) : (
          <span className="text-faint">no conectado</span>
        ),
    },
    {
      key: "open",
      header: "",
      align: "right",
      render: (r) => (
        <button
          type="button"
          onClick={() => setSelectedId(r.id)}
          className="text-xs text-muted hover:text-foreground"
        >
          Abrir
        </button>
      ),
    },
  ];

  if (orders.items.length === 0) {
    return (
      <HonestState
        icon="undo"
        title="Sin pedidos importados."
        description={
          <>
            Las devoluciones parten de pedidos reales.{" "}
            <Link href="/store/orders" className="text-accent hover:underline">
              Ir a Pedidos
            </Link>
            .
          </>
        }
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-border bg-surface/50 p-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Pedido
          <select
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none"
          >
            <option value="">—</option>
            {orders.items.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs text-muted">
          Motivo declarado
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none"
          />
        </label>
        <button
          type="button"
          onClick={create}
          disabled={!orderId || !reason.trim()}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          Crear devolución
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
        getKey={(r) => r.id}
        emptyMessage="Sin devoluciones en esta vista."
      />

      {selected ? (
        <ReturnDrawer
          key={selected.id}
          ret={selected}
          warehouses={warehouses.items}
          onClose={() => setSelectedId(null)}
          onChange={(patch) => returns.update(selected.id, patch)}
          onPost={(ms) => ledger.appendMany(ms)}
          ledger={ledger.entries}
        />
      ) : null}
    </div>
  );
}

function ReturnDrawer({
  ret,
  warehouses,
  onClose,
  onChange,
  onPost,
  ledger,
}: {
  ret: SalesReturn;
  warehouses: Warehouse[];
  onClose: () => void;
  onChange: (patch: Partial<SalesReturn>) => void;
  onPost: (ms: InventoryMovement[]) => void;
  ledger: InventoryMovement[];
}) {
  const [sku, setSku] = useState("");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const editable = ret.status !== "cerrada" && ret.status !== "rechazada";
  const next = RETURN_TRANSITIONS[ret.status];
  const inspectionOk = inspectionComplete(ret);

  function addLine() {
    if (!sku.trim() || !(Number(qty) > 0)) return;
    const line: ReturnLine = {
      id: localId(),
      sku: sku.trim(),
      qty: Number(qty),
      unit: "unidad",
      inspected: false,
    };
    onChange({ lines: [...ret.lines, line] });
    setSku("");
    setQty("");
  }
  function updateLine(id: string, patch: Partial<ReturnLine>) {
    onChange({ lines: ret.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  }
  function advance(to: ReturnStatus) {
    if (!reason.trim()) return;
    onChange({
      status: to,
      history: [
        ...ret.history,
        {
          at: new Date().toISOString(),
          actor: "operador-local",
          from: ret.status,
          to,
          reason: reason.trim(),
        },
      ],
    });
    setReason("");
  }
  function postDestinations() {
    const movements = buildReturnMovements(ret, "operador-local", ledger, undefined, localId);
    if (movements.length > 0) onPost(movements);
    onChange({ posted: true });
  }

  return (
    <DetailDrawer
      open
      onClose={onClose}
      title={`${ret.code}`}
      description={`Estado: ${returnStatusLabel(ret.status)} · motivo: ${ret.reason}`}
    >
      <div className="flex flex-col gap-5">
        {/* 1. Físico + estado */}
        <section className="rounded-lg border border-border bg-surface/50 p-3">
          <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-faint">
            1. Flujo físico
          </p>
          {next.length > 0 ? (
            <>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Motivo del cambio"
                className="mb-2 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none"
              />
              <div className="flex flex-wrap gap-1.5">
                {next.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => advance(s)}
                    disabled={!reason.trim()}
                    className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted hover:text-foreground disabled:opacity-50"
                  >
                    {returnStatusLabel(s)}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-faint">Estado terminal.</p>
          )}
        </section>

        {/* 2. Inspección + destino */}
        <section>
          <p className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-faint">
            2. Inspección y 3. destino
          </p>
          {editable ? (
            <div className="mb-2 flex flex-wrap items-end gap-2">
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="SKU"
                className="w-24 rounded border border-border bg-surface px-1.5 py-1 text-xs outline-none"
              />
              <input
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                type="number"
                placeholder="Cant."
                className="w-20 rounded border border-border bg-surface px-1.5 py-1 text-xs outline-none"
              />
              <select
                value={ret.warehouse ?? ""}
                onChange={(e) => onChange({ warehouse: e.target.value || undefined })}
                className="rounded border border-border bg-surface px-1.5 py-1 text-xs outline-none"
              >
                <option value="">almacén</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.code}>
                    {w.code}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addLine}
                className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted hover:text-foreground"
              >
                + Línea
              </button>
            </div>
          ) : null}
          {ret.lines.length === 0 ? (
            <p className="text-xs text-faint">Sin artículos.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {ret.lines.map((l) => (
                <li
                  key={l.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs"
                >
                  <span className="font-mono">{l.sku}</span>
                  <span className="text-muted">×{l.qty}</span>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={l.inspected}
                      disabled={!editable}
                      onChange={(e) => updateLine(l.id, { inspected: e.target.checked })}
                    />
                    inspeccionado
                  </label>
                  <select
                    value={l.destination ?? ""}
                    disabled={!editable || !l.inspected}
                    onChange={(e) =>
                      updateLine(l.id, {
                        destination: (e.target.value || undefined) as ReturnDestination,
                      })
                    }
                    className="rounded border border-border bg-surface px-1.5 py-0.5 text-xs outline-none disabled:opacity-50"
                  >
                    <option value="">destino</option>
                    {RETURN_DESTINATIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={postDestinations}
            disabled={!inspectionOk || ret.posted}
            title={
              !inspectionOk
                ? "No se reintegra antes de inspección"
                : ret.posted
                  ? "Ya contabilizado"
                  : undefined
            }
            className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {ret.posted ? "Reintegro contabilizado" : "Contabilizar reintegro (ledger)"}
          </button>
          <p className="mt-1 text-[0.66rem] text-faint">
            No se reintegra a disponible antes de inspección. Dañado/cuarentena nunca pasan a
            disponible. Idempotente; no edita saldos ni Shopify.
          </p>
        </section>

        {/* 4/5. Decisión financiera + reembolso observado */}
        <section className="rounded-lg border border-border bg-surface/50 p-3">
          <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-faint">
            4. Decisión financiera · 5. reembolso observado
          </p>
          <div className="grid grid-cols-2 gap-2">
            <RF
              label="Solicitado"
              value={ret.refund.requested ?? ""}
              onChange={(v) => onChange({ refund: { ...ret.refund, requested: v } })}
              disabled={!editable}
            />
            <RF
              label="Autorizado"
              value={ret.refund.authorized ?? ""}
              onChange={(v) => onChange({ refund: { ...ret.refund, authorized: v } })}
              disabled={!editable}
            />
            <RF
              label="Moneda"
              value={ret.refund.currency ?? ""}
              onChange={(v) => onChange({ refund: { ...ret.refund, currency: v } })}
              disabled={!editable}
            />
            <RF
              label="Referencia"
              value={ret.refund.reference ?? ""}
              onChange={(v) => onChange({ refund: { ...ret.refund, reference: v } })}
              disabled={!editable}
            />
          </div>
          <p className="mt-1.5 text-[0.66rem] text-faint">
            {ret.refund.status
              ? `Estado observado: ${ret.refund.status}`
              : "Reembolso no conectado"}
            . La devolución física no es el reembolso; una nota local no marca el reembolso como
            completado.
          </p>
        </section>
      </div>
    </DetailDrawer>
  );
}

function RF({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-[0.68rem] text-muted">
      {label}
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
        className="rounded border border-border bg-surface px-1.5 py-1 text-xs outline-none disabled:opacity-60"
      />
    </label>
  );
}
