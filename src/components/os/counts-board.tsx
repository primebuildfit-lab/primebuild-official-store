"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  DataTable,
  DetailDrawer,
  SegmentedControl,
  StatusBadge,
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
  COUNT_SCHEMA_VERSION,
  buildAdjustmentMovements,
  canApplyAdjustment,
  countStatusLabel,
  hasDifferences,
  isStockCount,
  lineDiff,
  visibleExpected,
  type CountLine,
  type CountStatus,
  type StockCount,
} from "@/lib/counts";

/**
 * Conteos y ajustes (PBOS-001 · ORDEN 14). Counting never modifies inventory;
 * only an approved adjustment does, by appending movements. A blind count
 * withholds the expected quantity at the data level (not CSS) unless the viewer
 * holds the authorized capability. An applied adjustment is immutable; a
 * correction is a compensating movement.
 */

const VIEWS: TabOption[] = [
  { value: "todos", label: "Todos" },
  { value: "planificado", label: "Planificados" },
  { value: "en-progreso", label: "En progreso" },
  { value: "pendiente-revision", label: "Pendientes de revisión" },
  { value: "con-diferencias", label: "Con diferencias" },
  { value: "aprobado", label: "Aprobados" },
  { value: "aplicado", label: "Aplicados" },
  { value: "cancelado", label: "Cancelados" },
];

const TONE: Record<CountStatus, Parameters<typeof StatusBadge>[0]["tone"]> = {
  planificado: "neutral",
  "en-progreso": "progress",
  "pendiente-revision": "progress",
  "con-diferencias": "warning",
  aprobado: "info",
  aplicado: "positive",
  cancelado: "neutral",
};

export function CountsBoard() {
  const warehouses = useVersionedCollection<Warehouse>(
    "inventory:warehouses",
    WAREHOUSE_SCHEMA_VERSION,
    isWarehouse,
  );
  const counts = useVersionedCollection<StockCount>(
    "inventory:counts",
    COUNT_SCHEMA_VERSION,
    isStockCount,
  );
  const ledger = useLedger<InventoryMovement>(
    "inventory:movements",
    INVENTORY_SCHEMA_VERSION,
    isMovement,
  );

  const [view, setView] = useState("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wh, setWh] = useState("");
  const [blind, setBlind] = useState(false);
  const [tolerance, setTolerance] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(false);

  const balances = useMemo(() => deriveBalances(ledger.entries), [ledger.entries]);
  const selected = counts.items.find((c) => c.id === selectedId) ?? null;

  function createCount() {
    if (!wh) return;
    const lines: CountLine[] = balances
      .filter((b) => b.warehouseId === wh)
      .map((b) => ({ id: localId(), sku: b.key, expected: b.onHand, counted: null }));
    counts.add({
      id: localId(),
      code: `CNT-${String(counts.items.length + 1).padStart(4, "0")}`,
      warehouseCode: wh,
      status: "planificado",
      blind,
      doubleCount: false,
      tolerance: tolerance.trim() ? Number(tolerance) : null,
      requiresApproval,
      lines,
      version: COUNT_SCHEMA_VERSION,
    });
    setWh("");
    setBlind(false);
    setTolerance("");
    setRequiresApproval(false);
  }

  const rows = useMemo(
    () => (view === "todos" ? counts.items : counts.items.filter((c) => c.status === view)),
    [counts.items, view],
  );

  const columns: Column<StockCount>[] = [
    {
      key: "code",
      header: "Código",
      render: (r) => <span className="font-mono text-xs">{r.code}</span>,
    },
    { key: "wh", header: "Almacén", render: (r) => r.warehouseCode },
    {
      key: "status",
      header: "Estado",
      render: (r) => <StatusBadge label={countStatusLabel(r.status)} tone={TONE[r.status]} />,
    },
    {
      key: "blind",
      header: "Método",
      render: (r) =>
        r.blind ? <Badge kind="info">ciego</Badge> : <span className="text-faint">abierto</span>,
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

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface/50 p-3">
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
                {w.code} · {w.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <input type="checkbox" checked={blind} onChange={(e) => setBlind(e.target.checked)} />
          Conteo ciego
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <input
            type="checkbox"
            checked={requiresApproval}
            onChange={(e) => setRequiresApproval(e.target.checked)}
          />
          Requiere aprobación
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Tolerancia
          <input
            value={tolerance}
            onChange={(e) => setTolerance(e.target.value)}
            type="number"
            placeholder="—"
            className="w-20 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none"
          />
        </label>
        <button
          type="button"
          onClick={createCount}
          disabled={!wh}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Crear conteo
        </button>
        <span className="ml-auto text-[0.68rem] text-faint">
          Sin opciones por defecto · esperado derivado del inventario
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
        emptyMessage="No hay conteos en esta vista. Crea un conteo arriba."
      />

      {selected ? (
        <CountDrawer
          key={selected.id}
          count={selected}
          onClose={() => setSelectedId(null)}
          onChange={(patch) => counts.update(selected.id, patch)}
          onPostMovements={(ms) => ledger.appendMany(ms)}
          ledger={ledger.entries}
        />
      ) : null}
    </div>
  );
}

function CountDrawer({
  count,
  onClose,
  onChange,
  onPostMovements,
  ledger,
}: {
  count: StockCount;
  onClose: () => void;
  onChange: (patch: Partial<StockCount>) => void;
  onPostMovements: (ms: InventoryMovement[]) => void;
  ledger: InventoryMovement[];
}) {
  const [canSeeExpected, setCanSeeExpected] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const editable = count.status === "en-progreso";

  function updateCounted(id: string, v: string) {
    onChange({
      lines: count.lines.map((l) =>
        l.id === id ? { ...l, counted: v.trim() === "" ? null : Number(v) } : l,
      ),
    });
  }
  function start() {
    onChange({ status: "en-progreso", startedAt: new Date().toISOString() });
  }
  function review() {
    onChange({ status: hasDifferences(count) ? "con-diferencias" : "pendiente-revision" });
  }
  function approve() {
    onChange({ status: "aprobado", approver: "operador-local" });
  }
  function apply() {
    const check = canApplyAdjustment(count, reason, true);
    if (!check.ok) return setError(check.error ?? "No válido.");
    const movements = buildAdjustmentMovements(count, "operador-local", ledger, undefined, localId);
    if (movements.length > 0) onPostMovements(movements);
    onChange({ status: "aplicado", closedAt: new Date().toISOString() });
    setReason("");
    setError(null);
  }
  function cancel() {
    if (count.status === "aplicado") return;
    onChange({ status: "cancelado" });
  }

  return (
    <DetailDrawer
      open
      onClose={onClose}
      title={`${count.code} · ${count.warehouseCode}`}
      description={`Estado: ${countStatusLabel(count.status)}${count.blind ? " · ciego" : ""}`}
    >
      <div className="flex flex-col gap-5">
        {count.blind ? (
          <label className="flex items-center gap-1.5 rounded-lg border border-border bg-surface/60 px-3 py-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={canSeeExpected}
              onChange={(e) => setCanSeeExpected(e.target.checked)}
            />
            Autoridad: revelar esperado (capacidad autorizada)
          </label>
        ) : null}

        <section>
          <p className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-faint">
            Líneas
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted/40 text-left text-[0.64rem] uppercase tracking-wider text-faint">
                  <th className="px-2 py-1.5 font-semibold">SKU</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Esperado</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Contado</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {count.lines.map((l) => {
                  const exp = visibleExpected(l, { blind: count.blind, canSeeExpected });
                  const d = lineDiff(l);
                  return (
                    <tr key={l.id} className="border-b border-border/50 last:border-0">
                      <td className="px-2 py-1.5 font-mono text-xs">{l.sku}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {exp == null ? <span className="text-faint">oculto</span> : exp}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <input
                          type="number"
                          value={l.counted ?? ""}
                          disabled={!editable}
                          onChange={(e) => updateCounted(l.id, e.target.value)}
                          className="w-16 rounded border border-border bg-surface px-1.5 py-1 text-right text-xs outline-none disabled:opacity-60"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {d == null || (count.blind && !canSeeExpected) ? (
                          <span className="text-faint">—</span>
                        ) : (
                          <span className={d === 0 ? "" : "text-warn"}>{d > 0 ? `+${d}` : d}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {count.lines.length === 0 ? (
            <p className="mt-2 text-xs text-faint">
              Sin líneas: este almacén no tiene existencias contabilizadas todavía.
            </p>
          ) : null}
        </section>

        <section className="rounded-lg border border-border bg-surface/50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            {count.status === "planificado" ? (
              <button
                type="button"
                onClick={start}
                className="rounded-lg border border-border px-3 py-1.5 text-xs"
              >
                Iniciar conteo
              </button>
            ) : null}
            {count.status === "en-progreso" ? (
              <button
                type="button"
                onClick={review}
                className="rounded-lg border border-border px-3 py-1.5 text-xs"
              >
                Enviar a revisión
              </button>
            ) : null}
            {count.status === "pendiente-revision" || count.status === "con-diferencias" ? (
              <button
                type="button"
                onClick={approve}
                className="rounded-lg border border-border px-3 py-1.5 text-xs"
              >
                Aprobar
              </button>
            ) : null}
            {count.status === "aprobado" ? (
              <>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Motivo del ajuste"
                  className="min-w-40 flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={apply}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Aplicar ajuste
                </button>
              </>
            ) : null}
            {count.status !== "aplicado" && count.status !== "cancelado" ? (
              <button
                type="button"
                onClick={cancel}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground"
              >
                Cancelar
              </button>
            ) : null}
          </div>
          {error ? <p className="mt-2 text-xs text-warn">{error}</p> : null}
          <p className="mt-1.5 text-[0.66rem] text-faint">
            Contar no modifica inventario. Aplicar crea movimientos append-only; un ajuste aplicado
            no se edita ni borra (se corrige con un movimiento compensatorio).
          </p>
        </section>
      </div>
    </DetailDrawer>
  );
}
