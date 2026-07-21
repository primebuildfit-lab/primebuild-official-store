"use client";

import { useMemo, useState } from "react";
import {
  ActivityTimeline,
  DataTable,
  DetailDrawer,
  MoneyValue,
  SegmentedControl,
  StatusBadge,
  type ActivityEvent,
  type Column,
  type TabOption,
} from "@/components/ds";
import { useLocalCollection, localId } from "@/lib/local-collection";
import {
  PO_TRANSITIONS,
  canDelete,
  orderSubtotal,
  orderTotal,
  statusLabel,
  type POLine,
  type POStatus,
  type PurchaseOrder,
} from "@/lib/purchase-orders";
import type { Supplier } from "@/lib/suppliers";

/**
 * Órdenes de compra (PBOS-001 · ORDEN 9). The full purchase-order lifecycle with
 * non-skippable states. Orders persist locally; every state change is explicit,
 * carries a reason and actor, and is recorded in history. Creating/exporting an
 * order sends nothing to a supplier; a PO with activity cannot be deleted and its
 * currency cannot change.
 */

const OPERATOR = "operador-local";

const VIEWS: TabOption[] = [
  { value: "todos", label: "Todos" },
  { value: "borrador", label: "Borradores" },
  { value: "en-revision", label: "Pendientes de aprobación" },
  { value: "aprobada", label: "Aprobadas" },
  { value: "emitida", label: "Emitidas" },
  { value: "confirmada", label: "Confirmadas" },
  { value: "en-transito", label: "En tránsito" },
  { value: "parcialmente-recibida", label: "Parciales" },
  { value: "con-discrepancias", label: "Con discrepancias" },
  { value: "atrasadas", label: "Atrasadas" },
  { value: "cerrada", label: "Cerradas" },
  { value: "cancelada", label: "Canceladas" },
];

const STATUS_TONE: Partial<Record<POStatus, Parameters<typeof StatusBadge>[0]["tone"]>> = {
  borrador: "neutral",
  "en-revision": "progress",
  aprobada: "info",
  emitida: "progress",
  confirmada: "progress",
  "en-transito": "progress",
  "parcialmente-recibida": "warning",
  "con-discrepancias": "critical",
  recibida: "positive",
  cerrada: "positive",
  cancelada: "neutral",
};

function isOverdue(o: PurchaseOrder): boolean {
  if (!o.expectedAt) return false;
  if (o.status === "recibida" || o.status === "cerrada" || o.status === "cancelada") return false;
  return new Date(o.expectedAt).getTime() < Date.now();
}

export function PurchaseOrdersBoard() {
  const orders = useLocalCollection<PurchaseOrder>("po:list");
  const suppliers = useLocalCollection<Supplier>("suppliers:list");
  const [view, setView] = useState("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // create form
  const [supplier, setSupplier] = useState("");
  const [currency, setCurrency] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const selected = orders.items.find((o) => o.id === selectedId) ?? null;

  function createOrder() {
    const s = supplier.trim();
    const c = currency.trim().toUpperCase();
    if (!s) return setCreateError("Selecciona o escribe un proveedor.");
    if (!/^[A-Z]{3}$/.test(c)) return setCreateError("Moneda ISO de 3 letras (p. ej. USD).");
    const number = `OC-${String(orders.items.length + 1).padStart(4, "0")}`;
    const now = new Date().toISOString();
    orders.add({
      id: localId(),
      number,
      supplier: s,
      warehouse: "",
      currency: c,
      status: "borrador",
      lines: [],
      additionalCosts: 0,
      createdAt: now,
      history: [{ at: now, actor: OPERATOR, from: null, to: "borrador", reason: "OC creada" }],
    });
    setSupplier("");
    setCurrency("");
    setCreateError(null);
  }

  const rows = useMemo(() => {
    if (view === "todos") return orders.items;
    if (view === "atrasadas") return orders.items.filter(isOverdue);
    return orders.items.filter((o) => o.status === view);
  }, [orders.items, view]);

  const columns: Column<PurchaseOrder>[] = [
    {
      key: "number",
      header: "Número",
      render: (r) => <span className="font-mono text-xs">{r.number}</span>,
    },
    {
      key: "supplier",
      header: "Proveedor",
      render: (r) => <span className="font-medium">{r.supplier}</span>,
    },
    {
      key: "status",
      header: "Estado",
      render: (r) => <StatusBadge label={statusLabel(r.status)} tone={STATUS_TONE[r.status]} />,
    },
    { key: "lines", header: "Líneas", align: "right", render: (r) => String(r.lines.length) },
    {
      key: "total",
      header: "Total",
      align: "right",
      render: (r) => <MoneyValue amount={orderTotal(r)} currency={r.currency} />,
    },
    {
      key: "actions",
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

  return (
    <div>
      {/* Create */}
      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-border bg-surface/50 p-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Proveedor
          <input
            list="po-suppliers"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder="Proveedor real"
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <datalist id="po-suppliers">
            {suppliers.items.map((s) => (
              <option key={s.id} value={s.name} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Moneda (ISO)
          <input
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            placeholder="USD"
            maxLength={3}
            className="w-20 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <button
          type="button"
          onClick={createOrder}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Crear borrador de OC
        </button>
        <span className="ml-auto text-[0.68rem] text-faint">
          Guardado local · crear no envía nada al proveedor
        </span>
      </div>
      {createError ? <p className="mb-3 text-xs text-warn">{createError}</p> : null}

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
        emptyMessage="No hay órdenes de compra en esta vista. Crea un borrador arriba."
        caption={
          <>
            <span>Registro local · estados no saltables</span>
            <span className="tabular-nums">{rows.length} órdenes</span>
          </>
        }
      />

      {selected ? (
        <OrderDrawer
          key={selected.id}
          order={selected}
          onClose={() => setSelectedId(null)}
          onChange={(patch) => orders.update(selected.id, patch)}
          onDelete={() => {
            orders.remove(selected.id);
            setSelectedId(null);
          }}
        />
      ) : null}
    </div>
  );
}

function OrderDrawer({
  order,
  onClose,
  onChange,
  onDelete,
}: {
  order: PurchaseOrder;
  onClose: () => void;
  onChange: (patch: Partial<PurchaseOrder>) => void;
  onDelete: () => void;
}) {
  const [target, setTarget] = useState<POStatus | "">("");
  const [reason, setReason] = useState("");
  const editable = order.status === "borrador";
  const allowed = PO_TRANSITIONS[order.status];
  const { subtotal, linesWithoutPrice } = orderSubtotal(order.lines);

  function addLine() {
    const line: POLine = { id: localId(), sku: "", qty: 1, unit: "unidad", unitPrice: null };
    onChange({ lines: [...order.lines, line] });
  }
  function updateLine(id: string, patch: Partial<POLine>) {
    onChange({ lines: order.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  }
  function removeLine(id: string) {
    onChange({ lines: order.lines.filter((l) => l.id !== id) });
  }

  function advance() {
    if (!target) return;
    if (!reason.trim()) return;
    const now = new Date().toISOString();
    onChange({
      status: target,
      history: [
        ...order.history,
        { at: now, actor: "operador-local", from: order.status, to: target, reason: reason.trim() },
      ],
    });
    setTarget("");
    setReason("");
  }

  const events: ActivityEvent[] = order.history
    .slice()
    .reverse()
    .map((e, i) => ({
      id: `${order.id}-${i}`,
      title: e.from ? `${statusLabel(e.from)} → ${statusLabel(e.to)}` : statusLabel(e.to),
      at: new Date(e.at).toLocaleString("es"),
      actor: e.actor,
      description: e.reason,
    }));

  return (
    <DetailDrawer
      open
      onClose={onClose}
      title={`${order.number} · ${order.supplier}`}
      description={`Estado: ${statusLabel(order.status)} · ${order.currency}`}
      footer={
        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete(order)}
          title={
            canDelete(order)
              ? "Eliminar borrador sin actividad"
              : "No se puede borrar una OC con actividad"
          }
          className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Eliminar
        </button>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Lines */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-faint">
              Líneas
            </p>
            {editable ? (
              <button
                type="button"
                onClick={addLine}
                className="text-xs text-accent hover:underline"
              >
                + Añadir línea
              </button>
            ) : (
              <span className="text-[0.66rem] text-faint">Solo editable en borrador</span>
            )}
          </div>
          {order.lines.length === 0 ? (
            <p className="text-xs text-faint">Sin líneas.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {order.lines.map((l) => (
                <li key={l.id} className="flex items-center gap-1.5">
                  <input
                    value={l.sku}
                    disabled={!editable}
                    onChange={(e) => updateLine(l.id, { sku: e.target.value })}
                    placeholder="SKU"
                    className="w-24 rounded border border-border bg-surface px-1.5 py-1 text-xs outline-none disabled:opacity-60"
                  />
                  <input
                    type="number"
                    value={l.qty}
                    disabled={!editable}
                    onChange={(e) => updateLine(l.id, { qty: Number(e.target.value) })}
                    className="w-14 rounded border border-border bg-surface px-1.5 py-1 text-right text-xs tabular-nums outline-none disabled:opacity-60"
                  />
                  <input
                    type="number"
                    value={l.unitPrice ?? ""}
                    disabled={!editable}
                    placeholder="—"
                    onChange={(e) =>
                      updateLine(l.id, {
                        unitPrice: e.target.value.trim() === "" ? null : Number(e.target.value),
                      })
                    }
                    className="w-20 rounded border border-border bg-surface px-1.5 py-1 text-right text-xs tabular-nums outline-none disabled:opacity-60"
                  />
                  {editable ? (
                    <button
                      type="button"
                      onClick={() => removeLine(l.id)}
                      className="text-xs text-faint hover:text-foreground"
                    >
                      ✕
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted">Subtotal</span>
            <MoneyValue amount={subtotal} currency={order.currency} />
          </div>
          {linesWithoutPrice > 0 ? (
            <p className="text-[0.66rem] text-faint">
              {linesWithoutPrice} líneas sin precio (excluidas, no 0).
            </p>
          ) : null}
          <div className="mt-1 flex items-center justify-between text-sm font-semibold">
            <span>Total</span>
            <MoneyValue amount={orderTotal(order)} currency={order.currency} />
          </div>
        </section>

        {/* Advance state */}
        {allowed.length > 0 ? (
          <section className="rounded-lg border border-border bg-surface/50 p-3">
            <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-faint">
              Cambiar de estado
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value as POStatus)}
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none"
              >
                <option value="">— Elegir —</option>
                {allowed.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Motivo (obligatorio)"
                className="min-w-40 flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none"
              />
              <button
                type="button"
                onClick={advance}
                disabled={!target || !reason.trim()}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Aplicar
              </button>
            </div>
            <p className="mt-1.5 text-[0.66rem] text-faint">
              Cada cambio registra actor, fecha y motivo. Los estados no se saltan.
            </p>
          </section>
        ) : (
          <p className="text-xs text-faint">Estado terminal: no admite más transiciones.</p>
        )}

        {/* History */}
        <section>
          <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-faint">
            Historial
          </p>
          <ActivityTimeline events={events} />
        </section>
      </div>
    </DetailDrawer>
  );
}
