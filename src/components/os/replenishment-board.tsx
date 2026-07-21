"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Badge,
  DataTable,
  HonestState,
  Icon,
  SegmentedControl,
  type Column,
  type TabOption,
} from "@/components/ds";
import {
  useVersionedCollection,
  useLedger,
  useLocalCollection,
  localId,
} from "@/lib/local-collection";
import {
  INVENTORY_SCHEMA_VERSION,
  deriveBalances,
  isMovement,
  type InventoryMovement,
} from "@/lib/inventory";
import { isWarehouse, WAREHOUSE_SCHEMA_VERSION, type Warehouse } from "@/lib/warehouses";
import { pendingFor, receivedSoFar, type Receipt } from "@/lib/receiving";
import type { PurchaseOrder } from "@/lib/purchase-orders";
import type { QuickBuyDraft, QuickBuyLine } from "@/lib/quick-buy";
import {
  REPLENISHMENT_SCHEMA_VERSION,
  computeSuggestion,
  isPolicy,
  validatePolicy,
  type ReplenishmentPolicy,
  type Suggestion,
} from "@/lib/replenishment";

/**
 * Reposición (PBOS-001 · ORDEN 15). Deterministic suggestions from real inputs
 * (target from a policy, available from the ledger, incoming from POs). Missing
 * required data yields "Datos insuficientes", never a made-up quantity, and no
 * demand/lead time is invented. Accepting a suggestion writes a Compra rápida
 * DRAFT with full traceability — it never creates or sends a purchase order.
 */

const RECEIVABLE = new Set<PurchaseOrder["status"]>([
  "emitida",
  "confirmada",
  "en-transito",
  "parcialmente-recibida",
]);

const VIEWS: TabOption[] = [
  { value: "sugerencias", label: "Sugerencias" },
  { value: "politicas", label: "Políticas" },
  { value: "riesgo", label: "Riesgo de agotamiento" },
  { value: "sin-politica", label: "Sin política" },
  { value: "ignoradas", label: "Ignoradas" },
  { value: "convertidas", label: "Convertidas en compra" },
];

interface SuggestionState {
  id: string; // policy id
  status: "ignorada" | "pospuesta" | "convertida";
  reason?: string;
}

export function ReplenishmentBoard() {
  const warehouses = useVersionedCollection<Warehouse>(
    "inventory:warehouses",
    WAREHOUSE_SCHEMA_VERSION,
    isWarehouse,
  );
  const policies = useVersionedCollection<ReplenishmentPolicy>(
    "replenishment:policies",
    REPLENISHMENT_SCHEMA_VERSION,
    isPolicy,
  );
  const states = useLocalCollection<SuggestionState>("replenishment:state");
  const accepted = useLocalCollection<Record<string, unknown> & { id: string }>(
    "replenishment:accepted",
  );
  const drafts = useLocalCollection<QuickBuyDraft>("quickbuy:drafts");
  const ledger = useLedger<InventoryMovement>(
    "inventory:movements",
    INVENTORY_SCHEMA_VERSION,
    isMovement,
  );
  const receipts = useLocalCollection<Receipt>("receiving:list");
  const pos = useLocalCollection<PurchaseOrder>("po:list");

  const [view, setView] = useState("sugerencias");

  const balances = useMemo(() => deriveBalances(ledger.entries), [ledger.entries]);
  const availableFor = (sku: string, wh: string) =>
    balances.find((b) => b.key === sku && b.warehouseId === wh)?.onHand ?? 0;
  const incomingFor = (sku: string) => {
    let total = 0;
    for (const po of pos.items) {
      if (!RECEIVABLE.has(po.status)) continue;
      for (const l of po.lines)
        if (l.sku === sku) total += pendingFor(l.qty, receivedSoFar(receipts.items, po.id, l.sku));
    }
    return total;
  };
  const stateOf = (policyId: string) => states.items.find((s) => s.id === policyId);

  const suggestions = useMemo(
    () =>
      policies.items
        .filter((p) => p.status === "activa")
        .map((p) => ({
          policy: p,
          suggestion: computeSuggestion(p, {
            available: availableFor(p.sku, p.warehouseCode),
            incoming: incomingFor(p.sku),
          }),
          state: stateOf(p.id),
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [policies.items, balances, pos.items, receipts.items, states.items],
  );

  function acceptToQuickBuy(policy: ReplenishmentPolicy, suggestion: Suggestion, finalQty: number) {
    const line: QuickBuyLine = {
      id: localId(),
      sku: policy.sku,
      recognized: false,
      unit: "unidad",
      qty: finalQty,
      supplier: policy.preferredSupplier,
      warehouse: policy.warehouseCode,
      moq: policy.moq ?? null,
      multiple: policy.multiple ?? null,
      unitCost: null,
      currency: null,
    };
    // Append to an existing "Reposición" draft or create one.
    const existing = drafts.items.find((d) => d.name === "Reposición");
    const draftId = existing?.id ?? localId();
    if (existing) {
      drafts.update(existing.id, {
        lines: [...existing.lines, line],
        updatedAt: new Date().toISOString(),
      });
    } else {
      drafts.add({
        id: draftId,
        name: "Reposición",
        warehouse: policy.warehouseCode,
        status: "borrador",
        lines: [line],
        updatedAt: new Date().toISOString(),
      });
    }
    accepted.add({
      id: localId(),
      suggestionId: policy.id,
      policyId: policy.id,
      policyVersion: policy.version,
      formula: suggestion.formula,
      inputsUsed: suggestion.inputsUsed,
      originalQty: suggestion.qty,
      finalQty,
      actor: "operador-local",
      at: new Date().toISOString(),
      draftId,
    });
    const st = stateOf(policy.id);
    if (st) states.update(st.id, { status: "convertida" });
    else states.add({ id: policy.id, status: "convertida" });
  }

  function ignore(policyId: string, reason: string) {
    const st = stateOf(policyId);
    if (st) states.update(st.id, { status: "ignorada", reason });
    else states.add({ id: policyId, status: "ignorada", reason });
  }

  // Views
  const skuKeysWithStock = useMemo(
    () => [...new Set(balances.map((b) => `${b.key}|${b.warehouseId}`))],
    [balances],
  );
  const policyKeys = new Set(policies.items.map((p) => `${p.sku}|${p.warehouseCode}`));

  return (
    <div>
      <SegmentedControl
        options={VIEWS}
        value={view}
        onChange={setView}
        className="mb-4 flex-wrap"
      />

      {view === "politicas" ? (
        <PoliciesTab policies={policies} warehouses={warehouses.items} />
      ) : view === "sin-politica" ? (
        skuKeysWithStock.filter((k) => !policyKeys.has(k)).length === 0 ? (
          <HonestState
            icon="refresh"
            title="Sin SKUs sin política."
            description="Todo SKU con existencias tiene una política, o aún no hay existencias."
          />
        ) : (
          <div className="rounded-xl border border-border p-3 text-sm">
            <p className="mb-2 text-xs text-muted">
              SKUs con existencias y sin política de reposición:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {skuKeysWithStock
                .filter((k) => !policyKeys.has(k))
                .map((k) => (
                  <span
                    key={k}
                    className="rounded border border-border px-2 py-0.5 font-mono text-xs"
                  >
                    {k.replace("|", " · ")}
                  </span>
                ))}
            </div>
          </div>
        )
      ) : view === "ignoradas" ? (
        <StateList
          states={states.items.filter((s) => s.status === "ignorada")}
          policies={policies.items}
          label="ignoradas"
        />
      ) : view === "convertidas" ? (
        <StateList
          states={states.items.filter((s) => s.status === "convertida")}
          policies={policies.items}
          label="convertidas"
        />
      ) : (
        <SuggestionsTab
          suggestions={
            view === "riesgo"
              ? suggestions.filter((s) => s.suggestion.qty != null && s.suggestion.qty > 0)
              : suggestions
          }
          onAccept={acceptToQuickBuy}
          onIgnore={ignore}
        />
      )}
    </div>
  );
}

function SuggestionsTab({
  suggestions,
  onAccept,
  onIgnore,
}: {
  suggestions: { policy: ReplenishmentPolicy; suggestion: Suggestion; state?: SuggestionState }[];
  onAccept: (p: ReplenishmentPolicy, s: Suggestion, finalQty: number) => void;
  onIgnore: (policyId: string, reason: string) => void;
}) {
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [ignoreReason, setIgnoreReason] = useState<Record<string, string>>({});

  if (suggestions.length === 0) {
    return (
      <HonestState
        icon="refresh"
        title="Sin sugerencias."
        description="Las sugerencias se derivan de políticas activas con datos reales. Crea una política o registra inventario."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {suggestions.map(({ policy, suggestion, state }) => {
        const insufficient = suggestion.qty == null;
        const finalStr =
          edited[policy.id] ?? (suggestion.qty != null ? String(suggestion.qty) : "");
        return (
          <div key={policy.id} className="rounded-xl border border-border bg-surface/50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">
                  <span className="font-mono">{policy.sku}</span> · {policy.warehouseCode}
                  {state ? (
                    <Badge kind="neutral" className="ml-2">
                      {state.status}
                    </Badge>
                  ) : null}
                </p>
                <p className="text-xs text-faint">{policy.name}</p>
              </div>
              {insufficient ? (
                <Badge kind="warning">Datos insuficientes</Badge>
              ) : (
                <span className="text-sm">
                  Sugerido: <span className="font-semibold tabular-nums">{suggestion.qty}</span>{" "}
                  {suggestion.unit}
                </span>
              )}
            </div>

            {insufficient ? (
              <p className="mt-2 text-xs text-warn">
                Datos insuficientes para sugerir reposición. Falta: {suggestion.missing.join(", ")}.
              </p>
            ) : (
              <>
                <p className="mt-1.5 text-[0.72rem] text-muted">Fórmula: {suggestion.formula}</p>
                <p className="text-[0.68rem] text-faint">
                  Datos:{" "}
                  {Object.entries(suggestion.inputsUsed)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(" · ")}
                  {suggestion.preferredSupplier
                    ? ` · proveedor ${suggestion.preferredSupplier}`
                    : ""}
                </p>
                <p className="text-[0.66rem] text-faint">{suggestion.limitations.join(" ")}</p>
              </>
            )}

            {!insufficient && suggestion.qty! > 0 ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label className="text-xs text-muted">
                  Cantidad{" "}
                  <input
                    type="number"
                    value={finalStr}
                    onChange={(e) => setEdited((s) => ({ ...s, [policy.id]: e.target.value }))}
                    className="w-20 rounded border border-border bg-surface px-1.5 py-1 text-right text-xs outline-none"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => onAccept(policy, suggestion, Number(finalStr) || suggestion.qty!)}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                >
                  <Icon name="bolt" size={13} />
                  Aceptar a Compra rápida
                </button>
                <input
                  value={ignoreReason[policy.id] ?? ""}
                  onChange={(e) => setIgnoreReason((s) => ({ ...s, [policy.id]: e.target.value }))}
                  placeholder="Motivo para ignorar"
                  className="rounded border border-border bg-surface px-2 py-1 text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={() => onIgnore(policy.id, ignoreReason[policy.id] ?? "")}
                  disabled={!(ignoreReason[policy.id] ?? "").trim()}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground disabled:opacity-50"
                >
                  Ignorar
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
      <p className="text-[0.68rem] text-faint">
        Aceptar escribe un borrador de Compra rápida con trazabilidad (política, versión, fórmula,
        datos, cantidad original y ajuste). Nunca crea ni envía una orden de compra.
      </p>
    </div>
  );
}

function PoliciesTab({
  policies,
  warehouses,
}: {
  policies: ReturnType<typeof useVersionedCollection<ReplenishmentPolicy>>;
  warehouses: Warehouse[];
}) {
  const [form, setForm] = useState({
    name: "",
    sku: "",
    wh: "",
    target: "",
    reorder: "",
    moq: "",
    multiple: "",
    supplier: "",
  });
  const [error, setError] = useState<string | null>(null);

  function add() {
    const parsed = validatePolicy(policies.items, {
      name: form.name,
      sku: form.sku,
      warehouseCode: form.wh,
    });
    if (!parsed.ok) return setError(parsed.error ?? "No válido.");
    policies.add({
      id: localId(),
      name: form.name.trim(),
      sku: form.sku.trim(),
      warehouseCode: form.wh,
      preferredSupplier: form.supplier.trim() || undefined,
      reorderPoint: form.reorder.trim() ? Number(form.reorder) : null,
      targetStock: form.target.trim() ? Number(form.target) : null,
      moq: form.moq.trim() ? Number(form.moq) : null,
      multiple: form.multiple.trim() ? Number(form.multiple) : null,
      status: "activa",
      version: REPLENISHMENT_SCHEMA_VERSION,
      createdAt: new Date().toISOString(),
    });
    setForm({
      name: "",
      sku: "",
      wh: "",
      target: "",
      reorder: "",
      moq: "",
      multiple: "",
      supplier: "",
    });
    setError(null);
  }

  const columns: Column<ReplenishmentPolicy>[] = [
    {
      key: "name",
      header: "Política",
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: "sku",
      header: "SKU",
      render: (r) => <span className="font-mono text-xs">{r.sku}</span>,
    },
    { key: "wh", header: "Almacén", render: (r) => r.warehouseCode },
    {
      key: "target",
      header: "Objetivo",
      align: "right",
      render: (r) =>
        r.targetStock == null ? <span className="text-faint">—</span> : r.targetStock,
    },
    {
      key: "reorder",
      header: "Reposición",
      align: "right",
      render: (r) =>
        r.reorderPoint == null ? <span className="text-faint">—</span> : r.reorderPoint,
    },
    { key: "status", header: "Estado", render: (r) => <Badge kind="neutral">{r.status}</Badge> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <button
          type="button"
          onClick={() => policies.remove(r.id)}
          className="text-xs text-muted hover:text-foreground"
        >
          Eliminar
        </button>
      ),
    },
  ];

  const input = (k: keyof typeof form, ph: string, w = "w-24", type = "text") => (
    <input
      value={form[k]}
      onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
      placeholder={ph}
      type={type}
      className={`${w} rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none`}
    />
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-border bg-surface/50 p-3">
        {input("name", "Nombre", "w-40")}
        {input("sku", "SKU")}
        <select
          value={form.wh}
          onChange={(e) => setForm((f) => ({ ...f, wh: e.target.value }))}
          className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none"
        >
          <option value="">Almacén</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.code}>
              {w.code}
            </option>
          ))}
        </select>
        {input("target", "Objetivo", "w-24", "number")}
        {input("reorder", "Reposición", "w-24", "number")}
        {input("moq", "MOQ", "w-20", "number")}
        {input("multiple", "Múltiplo", "w-20", "number")}
        {input("supplier", "Proveedor", "w-28")}
        <button
          type="button"
          onClick={add}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Crear política
        </button>
      </div>
      {error ? <p className="mb-3 text-xs text-warn">{error}</p> : null}
      <DataTable
        columns={columns}
        rows={policies.items}
        getKey={(r) => r.id}
        emptyMessage="Sin políticas. Créalas arriba; no hay política por defecto."
      />
    </div>
  );
}

function StateList({
  states,
  policies,
  label,
}: {
  states: SuggestionState[];
  policies: ReplenishmentPolicy[];
  label: string;
}) {
  if (states.length === 0)
    return (
      <HonestState
        icon="refresh"
        title={`Sin sugerencias ${label}.`}
        description="Aparecerán aquí cuando existan."
      />
    );
  return (
    <ul className="flex flex-col gap-1.5">
      {states.map((s) => {
        const p = policies.find((x) => x.id === s.id);
        return (
          <li
            key={s.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
          >
            <span>
              <span className="font-mono text-xs">{p?.sku ?? s.id}</span>{" "}
              <span className="text-muted">{p?.warehouseCode ?? ""}</span>
            </span>
            {s.reason ? <span className="text-xs text-faint">Motivo: {s.reason}</span> : null}
            {label === "convertidas" ? (
              <Link href="/purchasing/quick-buy" className="text-xs text-accent hover:underline">
                Ver Compra rápida
              </Link>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
