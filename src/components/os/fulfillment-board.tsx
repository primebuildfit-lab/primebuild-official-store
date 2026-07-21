"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Badge,
  DetailDrawer,
  HonestState,
  SegmentedControl,
  StatusBadge,
  type Column,
  DataTable,
  type TabOption,
} from "@/components/ds";
import { useVersionedCollection, localId } from "@/lib/local-collection";
import { isWarehouse, WAREHOUSE_SCHEMA_VERSION, type Warehouse } from "@/lib/warehouses";
import { ORDERS_SCHEMA_VERSION, isSalesOrder, type SalesOrderProjection } from "@/lib/orders";
import {
  FULFILLMENT_SCHEMA_VERSION,
  FULFILLMENT_TRANSITIONS,
  fulfillmentStatusLabel,
  hasShortages,
  isFulfillment,
  lineShortage,
  REMOTE_SHIPMENT_ALLOWED,
  shippingStage,
  shippingStageLabel,
  type Fulfillment,
  type FulfillmentLine,
  type FulfillmentStatus,
} from "@/lib/fulfillment";

/**
 * Preparación y envíos (PBOS-001 · ORDEN 20). Local picking/packing/shipping over
 * REAL imported orders only. It invents no carrier/tracking/label, never deducts
 * inventory by editing a balance (canonical deduction is a deferred ledger step),
 * keeps shipping stages distinct by evidence, and blocks remote confirmation. With
 * zero orders it shows an honest empty state.
 */

const VIEWS: TabOption[] = [
  { value: "todos", label: "Todos" },
  { value: "pendiente", label: "Pendientes" },
  { value: "asignado", label: "Asignados" },
  { value: "picking", label: "Picking" },
  { value: "con-faltantes", label: "Con faltantes" },
  { value: "preparado", label: "Preparados" },
  { value: "empacado", label: "Empacados" },
  { value: "listo-envio", label: "Listos para enviar" },
  { value: "enviado", label: "Enviados" },
  { value: "con-incidencia", label: "Con incidencia" },
  { value: "completado", label: "Completados" },
];

const TONE: Record<FulfillmentStatus, Parameters<typeof StatusBadge>[0]["tone"]> = {
  pendiente: "neutral",
  asignado: "progress",
  picking: "progress",
  "con-faltantes": "warning",
  preparado: "info",
  empacado: "info",
  "listo-envio": "info",
  enviado: "positive",
  "con-incidencia": "critical",
  completado: "positive",
};

export function FulfillmentBoard() {
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
  const fulfillments = useVersionedCollection<Fulfillment>(
    "fulfillment:list",
    FULFILLMENT_SCHEMA_VERSION,
    isFulfillment,
  );

  const [view, setView] = useState("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState("");
  const [wh, setWh] = useState("");

  const selected = fulfillments.items.find((f) => f.id === selectedId) ?? null;

  function create() {
    const order = orders.items.find((o) => o.id === orderId);
    if (!order) return;
    fulfillments.add({
      id: localId(),
      code: `FL-${String(fulfillments.items.length + 1).padStart(4, "0")}`,
      orderId: order.id,
      orderName: order.name,
      warehouse: wh || order.warehouse || "",
      status: "pendiente",
      lines: [],
      shippedLocally: false,
      remoteConfirmed: false,
      history: [
        {
          at: new Date().toISOString(),
          actor: "operador-local",
          from: null,
          to: "pendiente",
          reason: "Borrador de preparación creado",
        },
      ],
      source: "local",
      version: FULFILLMENT_SCHEMA_VERSION,
    });
    setOrderId("");
    setWh("");
  }

  const rows = useMemo(
    () =>
      view === "todos" ? fulfillments.items : fulfillments.items.filter((f) => f.status === view),
    [fulfillments.items, view],
  );

  const columns: Column<Fulfillment>[] = [
    {
      key: "code",
      header: "Preparación",
      render: (r) => <span className="font-mono text-xs">{r.code}</span>,
    },
    { key: "order", header: "Pedido", render: (r) => r.orderName },
    {
      key: "wh",
      header: "Almacén",
      render: (r) => r.warehouse || <span className="text-faint">—</span>,
    },
    {
      key: "status",
      header: "Estado",
      render: (r) => <StatusBadge label={fulfillmentStatusLabel(r.status)} tone={TONE[r.status]} />,
    },
    {
      key: "stage",
      header: "Envío",
      render: (r) => (
        <span className="text-xs text-muted">{shippingStageLabel(shippingStage(r))}</span>
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
        icon="send"
        title="Sin pedidos importados."
        description={
          <>
            La preparación usa pedidos reales importados. No se generan pedidos para demostrar la
            interfaz.{" "}
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
        <label className="flex flex-col gap-1 text-xs text-muted">
          Almacén
          <select
            value={wh}
            onChange={(e) => setWh(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none"
          >
            <option value="">—</option>
            {warehouses.items.map((w) => (
              <option key={w.id} value={w.code}>
                {w.code}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={create}
          disabled={!orderId}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Crear borrador de preparación
        </button>
        <span className="ml-auto text-[0.68rem] text-faint">
          Local · no descuenta inventario ni hace fulfillment remoto
        </span>
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
        emptyMessage="Sin preparaciones en esta vista."
      />

      {selected ? (
        <FulfillmentDrawer
          key={selected.id}
          fulfillment={selected}
          onClose={() => setSelectedId(null)}
          onChange={(patch) => fulfillments.update(selected.id, patch)}
        />
      ) : null}
    </div>
  );
}

function FulfillmentDrawer({
  fulfillment,
  onClose,
  onChange,
}: {
  fulfillment: Fulfillment;
  onClose: () => void;
  onChange: (patch: Partial<Fulfillment>) => void;
}) {
  const [sku, setSku] = useState("");
  const [required, setRequired] = useState("");
  const [reason, setReason] = useState("");
  const editable = fulfillment.status !== "completado";
  const stage = shippingStage(fulfillment);

  function addLine() {
    if (!sku.trim() || !(Number(required) > 0)) return;
    const line: FulfillmentLine = {
      id: localId(),
      sku: sku.trim(),
      required: Number(required),
      picked: 0,
    };
    onChange({ lines: [...fulfillment.lines, line] });
    setSku("");
    setRequired("");
  }
  function setPicked(id: string, v: string) {
    onChange({
      lines: fulfillment.lines.map((l) => (l.id === id ? { ...l, picked: Number(v) } : l)),
    });
  }
  function advance(to: FulfillmentStatus) {
    if (!reason.trim()) return;
    onChange({
      status: to,
      history: [
        ...fulfillment.history,
        {
          at: new Date().toISOString(),
          actor: "operador-local",
          from: fulfillment.status,
          to,
          reason: reason.trim(),
        },
      ],
    });
    setReason("");
  }

  const next = FULFILLMENT_TRANSITIONS[fulfillment.status];

  return (
    <DetailDrawer
      open
      onClose={onClose}
      title={`${fulfillment.code} · ${fulfillment.orderName}`}
      description={`Estado: ${fulfillmentStatusLabel(fulfillment.status)}`}
    >
      <div className="flex flex-col gap-5">
        {/* Picking */}
        <section>
          <p className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-faint">
            Picking
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
                value={required}
                onChange={(e) => setRequired(e.target.value)}
                type="number"
                placeholder="Requerido"
                className="w-24 rounded border border-border bg-surface px-1.5 py-1 text-xs outline-none"
              />
              <button
                type="button"
                onClick={addLine}
                className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted hover:text-foreground"
              >
                + Línea
              </button>
            </div>
          ) : null}
          {fulfillment.lines.length === 0 ? (
            <p className="text-xs text-faint">Sin líneas de picking.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {fulfillment.lines.map((l) => {
                const short = lineShortage(l);
                return (
                  <li
                    key={l.id}
                    className="flex items-center gap-2 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs"
                  >
                    <span className="font-mono">{l.sku}</span>
                    <span className="text-muted">req {l.required}</span>
                    <input
                      type="number"
                      min={0}
                      max={l.required}
                      value={l.picked}
                      disabled={!editable}
                      onChange={(e) => setPicked(l.id, e.target.value)}
                      className="w-16 rounded border border-border bg-surface px-1.5 py-1 text-right text-xs outline-none disabled:opacity-60"
                    />
                    {short > 0 ? (
                      <span className="text-warn">faltan {short}</span>
                    ) : (
                      <span className="text-ok">completo</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {hasShortages(fulfillment) ? (
            <p className="mt-1 text-[0.66rem] text-warn">
              Hay faltantes. Sustitución no permitida sin política explícita.
            </p>
          ) : null}
          <p className="mt-1 text-[0.66rem] text-faint">
            No descuenta inventario editando saldos; la contabilización de salida es un paso de
            ledger separado (diferido).
          </p>
        </section>

        {/* Packing */}
        <section className="grid grid-cols-2 gap-2">
          <Num
            label="Paquetes"
            value={fulfillment.packages}
            onChange={(v) => onChange({ packages: v })}
            disabled={!editable}
          />
          <TextF
            label="Peso (observado)"
            value={fulfillment.weight ?? ""}
            onChange={(v) => onChange({ weight: v })}
            disabled={!editable}
          />
          <TextF
            label="Dimensiones (observado)"
            value={fulfillment.dimensions ?? ""}
            onChange={(v) => onChange({ dimensions: v })}
            disabled={!editable}
          />
          <TextF
            label="Materiales"
            value={fulfillment.materials ?? ""}
            onChange={(v) => onChange({ materials: v })}
            disabled={!editable}
          />
        </section>

        {/* Shipping */}
        <section className="rounded-lg border border-border bg-surface/50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-faint">
              Envío
            </p>
            <Badge kind="neutral">{shippingStageLabel(stage)}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <TextF
              label="Transportista (observado)"
              value={fulfillment.carrierObserved ?? ""}
              onChange={(v) => onChange({ carrierObserved: v })}
              disabled={!editable}
            />
            <TextF
              label="Tracking (observado)"
              value={fulfillment.trackingObserved ?? ""}
              onChange={(v) => onChange({ trackingObserved: v })}
              disabled={!editable}
            />
            <TextF
              label="Etiqueta (observada)"
              value={fulfillment.labelObserved ?? ""}
              onChange={(v) => onChange({ labelObserved: v })}
              disabled={!editable}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onChange({ shippedLocally: !fulfillment.shippedLocally })}
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground"
            >
              {fulfillment.shippedLocally ? "Quitar marca local" : "Marcar preparado localmente"}
            </button>
            <button
              type="button"
              disabled={!REMOTE_SHIPMENT_ALLOWED}
              title="Confirmación remota no disponible"
              className="cursor-not-allowed rounded-lg border border-border px-2.5 py-1.5 text-xs text-faint opacity-60"
            >
              Confirmar envío (remoto)
            </button>
          </div>
          <p className="mt-1.5 text-[0.66rem] text-faint">
            &quot;Proveedor de envío no conectado&quot; · &quot;Confirmación remota no
            disponible&quot;. Una marca local no es un envío confirmado en Shopify. No se inventan
            transportista, tarifa, etiqueta ni tracking.
          </p>
        </section>

        {/* Advance */}
        {next.length > 0 ? (
          <section className="rounded-lg border border-border bg-surface/50 p-3">
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo (obligatorio)"
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
                  {fulfillmentStatusLabel(s)}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <p className="text-xs text-faint">Estado terminal.</p>
        )}
      </div>
    </DetailDrawer>
  );
}

function TextF({
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

function Num({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value?: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-[0.68rem] text-muted">
      {label}
      <input
        type="number"
        min={0}
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        placeholder="—"
        className="rounded border border-border bg-surface px-1.5 py-1 text-xs outline-none disabled:opacity-60"
      />
    </label>
  );
}
