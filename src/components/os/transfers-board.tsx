"use client";

import { useMemo, useState } from "react";
import {
  ActivityTimeline,
  DataTable,
  DetailDrawer,
  SegmentedControl,
  StatusBadge,
  type ActivityEvent,
  type Column,
  type TabOption,
} from "@/components/ds";
import { useVersionedCollection, useLedger, localId } from "@/lib/local-collection";
import {
  INVENTORY_SCHEMA_VERSION,
  deriveBalances,
  isMovement,
  type InventoryMovement,
} from "@/lib/inventory";
import { isWarehouse, WAREHOUSE_SCHEMA_VERSION, type Warehouse } from "@/lib/warehouses";
import {
  TRANSFER_SCHEMA_VERSION,
  buildDispatchMovements,
  buildReceiveMovements,
  isTransfer,
  transferStatusLabel,
  validateTransfer,
  withinAvailable,
  type Transfer,
  type TransferLine,
  type TransferStatus,
} from "@/lib/transfers";

/**
 * Transferencias (PBOS-001 · ORDEN 13). Move stock between warehouses. Dispatch
 * and receipt are distinct movements; dispatched stock leaves the origin and is
 * In-transit until received at the destination — never available in both. Partial
 * receipts keep a pending quantity, movements are idempotent, and a dispatched
 * transfer cannot be cancelled without resolution. Nothing touches Shopify.
 */

const VIEWS: TabOption[] = [
  { value: "todos", label: "Todas" },
  { value: "borrador", label: "Borradores" },
  { value: "pendiente", label: "Pendientes" },
  { value: "preparando", label: "Preparando" },
  { value: "en-transito", label: "En tránsito" },
  { value: "parcial", label: "Parciales" },
  { value: "con-discrepancias", label: "Con discrepancias" },
  { value: "recibida", label: "Recibidas" },
  { value: "cancelada", label: "Canceladas" },
];

const TONE: Record<TransferStatus, Parameters<typeof StatusBadge>[0]["tone"]> = {
  borrador: "neutral",
  pendiente: "progress",
  preparando: "progress",
  "en-transito": "warning",
  parcial: "warning",
  "con-discrepancias": "critical",
  recibida: "positive",
  cancelada: "neutral",
};

export function TransfersBoard() {
  const warehouses = useVersionedCollection<Warehouse>(
    "inventory:warehouses",
    WAREHOUSE_SCHEMA_VERSION,
    isWarehouse,
  );
  const transfers = useVersionedCollection<Transfer>(
    "inventory:transfers",
    TRANSFER_SCHEMA_VERSION,
    isTransfer,
  );
  const ledger = useLedger<InventoryMovement>(
    "inventory:movements",
    INVENTORY_SCHEMA_VERSION,
    isMovement,
  );

  const [view, setView] = useState("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [dest, setDest] = useState("");
  const [sku, setSku] = useState("");
  const [qty, setQty] = useState("");
  const [draftLines, setDraftLines] = useState<TransferLine[]>([]);
  const [error, setError] = useState<string | null>(null);

  const balances = useMemo(() => deriveBalances(ledger.entries), [ledger.entries]);
  const availableAt = (skuv: string, whCode: string) =>
    balances.find((b) => b.key === skuv && b.warehouseId === whCode)?.onHand ?? 0;

  const selected = transfers.items.find((t) => t.id === selectedId) ?? null;

  function addLine() {
    if (!sku.trim() || !(Number(qty) > 0)) return;
    setDraftLines((ls) => [
      ...ls,
      { id: localId(), sku: sku.trim(), qty: Number(qty), unit: "unidad", received: 0 },
    ]);
    setSku("");
    setQty("");
  }

  function createTransfer() {
    const parsed = validateTransfer({ originCode: origin, destCode: dest, lines: draftLines });
    if (!parsed.ok) return setError(parsed.error ?? "No válido.");
    const now = new Date().toISOString();
    transfers.add({
      id: localId(),
      code: `TR-${String(transfers.items.length + 1).padStart(4, "0")}`,
      originCode: origin,
      destCode: dest,
      status: "borrador",
      lines: draftLines,
      history: [
        {
          at: now,
          actor: "operador-local",
          from: null,
          to: "borrador",
          reason: "Transferencia creada",
        },
      ],
      version: TRANSFER_SCHEMA_VERSION,
    });
    setOrigin("");
    setDest("");
    setDraftLines([]);
    setError(null);
  }

  const rows = useMemo(
    () => (view === "todos" ? transfers.items : transfers.items.filter((t) => t.status === view)),
    [transfers.items, view],
  );

  const columns: Column<Transfer>[] = [
    {
      key: "code",
      header: "Código",
      render: (r) => <span className="font-mono text-xs">{r.code}</span>,
    },
    {
      key: "route",
      header: "Ruta",
      render: (r) => (
        <span className="text-muted">
          {r.originCode} → {r.destCode}
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      render: (r) => <StatusBadge label={transferStatusLabel(r.status)} tone={TONE[r.status]} />,
    },
    { key: "lines", header: "Líneas", align: "right", render: (r) => String(r.lines.length) },
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

  const noWarehouses = warehouses.items.length < 2;

  return (
    <div>
      {/* Create */}
      <div className="mb-4 flex flex-col gap-2 rounded-xl border border-border bg-surface/50 p-3">
        {noWarehouses ? (
          <p className="text-xs text-warn">
            Necesitas al menos dos almacenes (Inventario → Almacenes) para transferir. No se
            inventan almacenes.
          </p>
        ) : null}
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-muted">
            Origen
            <select
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none"
            >
              <option value="">—</option>
              {warehouses.items.map((w) => (
                <option key={w.id} value={w.code}>
                  {w.code} · {w.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Destino
            <select
              value={dest}
              onChange={(e) => setDest(e.target.value)}
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none"
            >
              <option value="">—</option>
              {warehouses.items.map((w) => (
                <option key={w.id} value={w.code}>
                  {w.code} · {w.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            SKU
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="SKU"
              className="w-24 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Cantidad
            <input
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              type="number"
              className="w-20 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none"
            />
          </label>
          <button
            type="button"
            onClick={addLine}
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground"
          >
            + Línea
          </button>
          <button
            type="button"
            onClick={createTransfer}
            disabled={noWarehouses}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Crear transferencia
          </button>
        </div>
        {draftLines.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 text-xs text-muted">
            {draftLines.map((l) => (
              <span key={l.id} className="rounded border border-border px-2 py-0.5 font-mono">
                {l.sku} × {l.qty}
              </span>
            ))}
          </div>
        ) : null}
        {error ? <p className="text-xs text-warn">{error}</p> : null}
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
        emptyMessage="No hay transferencias en esta vista."
        caption={
          <>
            <span>Registro local · despacho y recepción son movimientos distintos</span>
            <span className="tabular-nums">{rows.length} transferencias</span>
          </>
        }
      />

      {selected ? (
        <TransferDrawer
          key={selected.id}
          transfer={selected}
          availableAt={availableAt}
          onClose={() => setSelectedId(null)}
          onChange={(patch) => transfers.update(selected.id, patch)}
          onPostMovements={(ms) => ledger.appendMany(ms)}
          ledger={ledger.entries}
        />
      ) : null}
    </div>
  );
}

function TransferDrawer({
  transfer,
  availableAt,
  onClose,
  onChange,
  onPostMovements,
  ledger,
}: {
  transfer: Transfer;
  availableAt: (sku: string, whCode: string) => number;
  onClose: () => void;
  onChange: (patch: Partial<Transfer>) => void;
  onPostMovements: (ms: InventoryMovement[]) => void;
  ledger: InventoryMovement[];
}) {
  const [reason, setReason] = useState("");
  const [override, setOverride] = useState(false);
  const [recv, setRecv] = useState<Record<string, string>>({});

  function event(to: TransferStatus, why: string) {
    return {
      at: new Date().toISOString(),
      actor: "operador-local",
      from: transfer.status,
      to,
      reason: why,
    };
  }

  function approve() {
    if (!reason.trim()) return;
    onChange({
      status: "pendiente",
      history: [...transfer.history, event("pendiente", reason.trim())],
    });
    setReason("");
  }
  function prepare() {
    if (!reason.trim()) return;
    onChange({
      status: "preparando",
      history: [...transfer.history, event("preparando", reason.trim())],
    });
    setReason("");
  }
  function dispatch() {
    if (!reason.trim()) return;
    // Availability guard unless overridden with a reason.
    const shortages = transfer.lines.filter(
      (l) => !withinAvailable(availableAt(l.sku, transfer.originCode), l.qty),
    );
    if (shortages.length > 0 && !override) return;
    const movements = buildDispatchMovements(
      transfer,
      "operador-local",
      ledger,
      undefined,
      localId,
    );
    if (movements.length > 0) onPostMovements(movements);
    onChange({
      status: "en-transito",
      dispatchedAt: new Date().toISOString(),
      history: [
        ...transfer.history,
        event(
          "en-transito",
          `${reason.trim()}${override ? " (excede disponible, autorizado)" : ""}`,
        ),
      ],
    });
    setReason("");
    setOverride(false);
  }
  function applyReceive() {
    const deltas: Record<string, number> = {};
    for (const l of transfer.lines) {
      const d = Number(recv[l.id] ?? 0);
      if (d > 0) deltas[l.id] = Math.min(d, l.qty - l.received);
    }
    const movements = buildReceiveMovements(
      transfer,
      deltas,
      "operador-local",
      localId(),
      undefined,
      localId,
    );
    if (movements.length > 0) onPostMovements(movements);
    const newLines = transfer.lines.map((l) => ({
      ...l,
      received: l.received + (deltas[l.id] ?? 0),
    }));
    const allDone = newLines.every((l) => l.received >= l.qty);
    const status: TransferStatus = allDone ? "recibida" : "parcial";
    onChange({
      status,
      lines: newLines,
      receivedAt: allDone ? new Date().toISOString() : transfer.receivedAt,
      history: [...transfer.history, event(status, "Recepción registrada")],
    });
    setRecv({});
  }
  function cancel() {
    if (transfer.dispatchedAt) return; // dispatched → requires resolution, not a plain cancel
    onChange({
      status: "cancelada",
      history: [
        ...transfer.history,
        event("cancelada", reason.trim() || "Cancelada antes de despacho"),
      ],
    });
    setReason("");
  }

  const events: ActivityEvent[] = transfer.history
    .slice()
    .reverse()
    .map((e, i) => ({
      id: `${transfer.id}-${i}`,
      title: e.from
        ? `${transferStatusLabel(e.from)} → ${transferStatusLabel(e.to)}`
        : transferStatusLabel(e.to),
      at: new Date(e.at).toLocaleString("es"),
      actor: e.actor,
      description: e.reason,
    }));

  const canReceive = transfer.status === "en-transito" || transfer.status === "parcial";

  return (
    <DetailDrawer
      open
      onClose={onClose}
      title={`${transfer.code} · ${transfer.originCode} → ${transfer.destCode}`}
      description={`Estado: ${transferStatusLabel(transfer.status)}`}
    >
      <div className="flex flex-col gap-5">
        <section>
          <p className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-faint">
            Líneas
          </p>
          <ul className="flex flex-col gap-1 text-sm">
            {transfer.lines.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-2.5 py-1.5"
              >
                <span className="font-mono text-xs">{l.sku}</span>
                <span className="text-xs text-muted">
                  {l.qty} {l.unit} · recibido {l.received} · disp. origen{" "}
                  {availableAt(l.sku, transfer.originCode)}
                </span>
                {canReceive ? (
                  <input
                    type="number"
                    min={0}
                    max={l.qty - l.received}
                    value={recv[l.id] ?? ""}
                    onChange={(e) => setRecv((r) => ({ ...r, [l.id]: e.target.value }))}
                    placeholder="recibir"
                    className="w-20 rounded border border-border bg-surface px-1.5 py-1 text-right text-xs outline-none"
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        {/* Actions per state */}
        <section className="rounded-lg border border-border bg-surface/50 p-3">
          {transfer.status === "borrador" ||
          transfer.status === "pendiente" ||
          transfer.status === "preparando" ? (
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo (obligatorio)"
              className="mb-2 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none"
            />
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {transfer.status === "borrador" ? (
              <button
                type="button"
                onClick={approve}
                disabled={!reason.trim()}
                className="rounded-lg border border-border px-3 py-1.5 text-xs disabled:opacity-50"
              >
                Aprobar
              </button>
            ) : null}
            {transfer.status === "pendiente" ? (
              <button
                type="button"
                onClick={prepare}
                disabled={!reason.trim()}
                className="rounded-lg border border-border px-3 py-1.5 text-xs disabled:opacity-50"
              >
                Preparar
              </button>
            ) : null}
            {transfer.status === "preparando" ? (
              <>
                <button
                  type="button"
                  onClick={dispatch}
                  disabled={!reason.trim()}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Despachar
                </button>
                <label className="flex items-center gap-1 text-[0.68rem] text-muted">
                  <input
                    type="checkbox"
                    checked={override}
                    onChange={(e) => setOverride(e.target.checked)}
                  />
                  Autorizar exceder disponible
                </label>
              </>
            ) : null}
            {canReceive ? (
              <button
                type="button"
                onClick={applyReceive}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white"
              >
                Registrar recepción
              </button>
            ) : null}
            {!transfer.dispatchedAt &&
            transfer.status !== "cancelada" &&
            transfer.status !== "recibida" ? (
              <button
                type="button"
                onClick={cancel}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground"
              >
                Cancelar
              </button>
            ) : null}
          </div>
          {transfer.status === "preparando" ? (
            <p className="mt-1.5 text-[0.66rem] text-faint">
              Despachar retira del origen y pasa a En tránsito; no aparece en destino hasta recibir.
              No transferir más de lo disponible sin autorización y motivo.
            </p>
          ) : null}
          {transfer.dispatchedAt &&
          (transfer.status === "en-transito" || transfer.status === "parcial") ? (
            <p className="mt-1.5 text-[0.66rem] text-faint">
              Ya despachada: cancelar requiere retorno o resolución, no un cancelado simple.
            </p>
          ) : null}
        </section>

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
