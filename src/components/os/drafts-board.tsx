"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Badge,
  DataTable,
  DetailDrawer,
  HonestState,
  MoneyValue,
  SegmentedControl,
  StatusBadge,
  type Column,
  type TabOption,
} from "@/components/ds";
import { useVersionedCollection, localId } from "@/lib/local-collection";
import { ORDERS_SCHEMA_VERSION, isSalesOrder, type SalesOrderProjection } from "@/lib/orders";
import {
  DRAFTS_SCHEMA_VERSION,
  draftToOrderProjection,
  draftTotal,
  effectiveStatus,
  isSalesDraft,
  validateDraft,
  type DraftLine,
  type DraftStatus,
  type SalesDraft,
} from "@/lib/drafts";
import type { StoreProduct } from "@/server/integrations/store/store.service";

/**
 * Borradores y cotizaciones (PBOS-DRAFTS-CORRECTIVE-001). Local drafts/quotes over
 * real catalog and customer data. Unknown prices read "No medido" (never 0),
 * currencies are never mixed, converting creates a LOCAL order projection with
 * traceability — never a Shopify order, reservation or email.
 */

const VIEWS: TabOption[] = [
  { value: "todos", label: "Todos" },
  { value: "borrador", label: "Borradores" },
  { value: "cotizacion", label: "Cotizaciones" },
  { value: "pendiente-revision", label: "Pendientes de revisión" },
  { value: "convertido", label: "Convertidos" },
  { value: "expirado", label: "Expirados" },
  { value: "cancelado", label: "Cancelados" },
  { value: "archivado", label: "Archivados" },
];

const TONE: Record<DraftStatus, Parameters<typeof StatusBadge>[0]["tone"]> = {
  abierto: "neutral",
  "pendiente-revision": "progress",
  convertido: "positive",
  expirado: "warning",
  cancelado: "neutral",
  archivado: "neutral",
};

export function DraftsBoard({
  products,
  connected,
}: {
  products: StoreProduct[];
  connected: boolean;
}) {
  const drafts = useVersionedCollection<SalesDraft>(
    "sales:drafts",
    DRAFTS_SCHEMA_VERSION,
    isSalesDraft,
  );
  const orders = useVersionedCollection<SalesOrderProjection>(
    "orders:projections",
    ORDERS_SCHEMA_VERSION,
    isSalesOrder,
  );
  const [view, setView] = useState("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [kind, setKind] = useState<"borrador" | "cotizacion">("cotizacion");
  const [currency, setCurrency] = useState("");
  const [customer, setCustomer] = useState("");
  const [error, setError] = useState<string | null>(null);

  const customers = useMemo(
    () =>
      Array.from(new Set(orders.items.map((o) => o.customerMasked).filter(Boolean))) as string[],
    [orders.items],
  );
  const selected = drafts.items.find((d) => d.id === selectedId) ?? null;

  function create() {
    const cur = currency.trim().toUpperCase();
    const parsed = validateDraft({ currency: cur || null, lines: [] });
    if (!parsed.ok) return setError(parsed.error ?? "No válido.");
    const now = new Date().toISOString();
    drafts.add({
      id: localId(),
      kind,
      customerRef: customer.trim() || null,
      lines: [],
      currency: cur,
      discount: null,
      status: "abierto",
      validUntil: null,
      responsible: null,
      actor: "operador-local",
      reason: null,
      source: "local",
      version: DRAFTS_SCHEMA_VERSION,
      history: [{ at: now, actor: "operador-local", action: `${kind} creada` }],
      createdAt: now,
      updatedAt: now,
    });
    setCurrency("");
    setCustomer("");
    setError(null);
  }

  const rows = useMemo(() => {
    return drafts.items.filter((d) => {
      const st = effectiveStatus(d);
      if (view === "todos") return true;
      if (view === "borrador") return d.kind === "borrador" && st === "abierto";
      if (view === "cotizacion") return d.kind === "cotizacion" && st === "abierto";
      return st === view;
    });
  }, [drafts.items, view]);

  const columns: Column<SalesDraft>[] = [
    {
      key: "id",
      header: "ID",
      render: (d) => <span className="font-mono text-xs">{d.id.slice(0, 6)}</span>,
    },
    { key: "kind", header: "Tipo", render: (d) => <Badge kind="neutral">{d.kind}</Badge> },
    {
      key: "customer",
      header: "Cliente",
      render: (d) => d.customerRef ?? <span className="text-faint">—</span>,
    },
    { key: "lines", header: "Líneas", align: "right", render: (d) => String(d.lines.length) },
    {
      key: "total",
      header: "Total",
      align: "right",
      render: (d) => <MoneyValue amount={draftTotal(d).total} currency={d.currency} />,
    },
    {
      key: "status",
      header: "Estado",
      render: (d) => <StatusBadge label={effectiveStatus(d)} tone={TONE[effectiveStatus(d)]} />,
    },
    {
      key: "open",
      header: "",
      align: "right",
      render: (d) => (
        <button
          type="button"
          onClick={() => setSelectedId(d.id)}
          className="text-xs text-muted hover:text-foreground"
        >
          Abrir
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-border bg-surface/50 p-3">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as "borrador" | "cotizacion")}
          className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none"
        >
          <option value="cotizacion">Cotización</option>
          <option value="borrador">Borrador</option>
        </select>
        <input
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          list="draft-customers"
          placeholder="Cliente (opcional)"
          className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none"
        />
        <datalist id="draft-customers">
          {customers.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <input
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          placeholder="Moneda (USD)"
          maxLength={3}
          className="w-24 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm uppercase outline-none"
        />
        <button
          type="button"
          onClick={create}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Crear
        </button>
        <span className="ml-auto text-[0.68rem] text-faint">
          Local · una moneda por registro · sin cliente/producto ficticio
        </span>
      </div>
      {error ? <p className="mb-3 text-xs text-warn">{error}</p> : null}

      <SegmentedControl
        options={VIEWS}
        value={view}
        onChange={setView}
        className="mb-4 flex-wrap"
      />

      {drafts.items.length === 0 ? (
        <HonestState
          icon="file"
          title="Sin borradores ni cotizaciones."
          description={
            <>
              Créalos arriba. Reutilizan catálogo, clientes y precios reales; con catálogo vacío
              puedes añadir líneas manualmente.{" "}
              <Link href="/store/products" className="text-accent hover:underline">
                Ver Productos
              </Link>
              .
            </>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getKey={(d) => d.id}
          emptyMessage="Sin registros en esta vista."
        />
      )}

      {selected ? (
        <DraftDrawer
          key={selected.id}
          draft={selected}
          products={products}
          connected={connected}
          onClose={() => setSelectedId(null)}
          onChange={(patch) =>
            drafts.update(selected.id, { ...patch, updatedAt: new Date().toISOString() })
          }
          onConvert={() => {
            const proj = draftToOrderProjection(selected, undefined, localId);
            const exists = orders.items.some((o) => o.correlationId === proj.correlationId);
            if (!exists) orders.add(proj);
            drafts.update(selected.id, {
              status: "convertido",
              updatedAt: new Date().toISOString(),
              history: [
                ...selected.history,
                {
                  at: new Date().toISOString(),
                  actor: "operador-local",
                  action: "Convertido a proyección de pedido local",
                },
              ],
            });
          }}
        />
      ) : null}
    </div>
  );
}

function DraftDrawer({
  draft,
  products,
  connected,
  onClose,
  onChange,
  onConvert,
}: {
  draft: SalesDraft;
  products: StoreProduct[];
  connected: boolean;
  onClose: () => void;
  onChange: (patch: Partial<SalesDraft>) => void;
  onConvert: () => void;
}) {
  const editable = draft.status === "abierto";
  const { total, linesWithoutPrice } = draftTotal(draft);

  function addLine(l: DraftLine) {
    onChange({
      lines: [...draft.lines, l],
      history: [
        ...draft.history,
        { at: new Date().toISOString(), actor: "operador-local", action: "Línea añadida" },
      ],
    });
  }
  function updateLine(id: string, patch: Partial<DraftLine>) {
    onChange({ lines: draft.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  }
  function setStatus(status: DraftStatus, action: string) {
    onChange({
      status,
      history: [
        ...draft.history,
        { at: new Date().toISOString(), actor: "operador-local", action },
      ],
    });
  }
  function exportDraft() {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${draft.kind}-${draft.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DetailDrawer
      open
      onClose={onClose}
      title={`${draft.kind} ${draft.id.slice(0, 6)}`}
      description={`Estado: ${effectiveStatus(draft)} · ${draft.currency}`}
    >
      <div className="flex flex-col gap-5">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-faint">
              Líneas
            </p>
            {editable ? (
              <span className="text-[0.66rem] text-faint">Editable en abierto</span>
            ) : (
              <span className="text-[0.66rem] text-faint">Solo lectura</span>
            )}
          </div>
          {editable ? (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {connected && products.length > 0 ? (
                products.slice(0, 20).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      addLine({
                        id: localId(),
                        sku: "",
                        title: p.title,
                        qty: 1,
                        unit: "unidad",
                        unitPrice: Number(p.price) || null,
                      })
                    }
                    className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-muted hover:text-foreground"
                  >
                    + {p.title}
                  </button>
                ))
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    addLine({
                      id: localId(),
                      sku: "",
                      title: undefined,
                      qty: 1,
                      unit: "unidad",
                      unitPrice: null,
                    })
                  }
                  className="rounded-lg border border-dashed border-border px-2 py-1 text-xs text-muted hover:text-foreground"
                >
                  + Línea manual
                </button>
              )}
            </div>
          ) : null}
          {draft.lines.length === 0 ? (
            <p className="text-xs text-faint">Sin líneas.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {draft.lines.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center gap-1.5 text-xs">
                  <input
                    value={l.sku}
                    disabled={!editable}
                    onChange={(e) => updateLine(l.id, { sku: e.target.value })}
                    placeholder="SKU"
                    className="w-20 rounded border border-border bg-surface px-1.5 py-1 outline-none disabled:opacity-60"
                  />
                  {l.title ? <span className="text-muted">{l.title}</span> : null}
                  <input
                    type="number"
                    value={l.qty}
                    disabled={!editable}
                    onChange={(e) => updateLine(l.id, { qty: Number(e.target.value) })}
                    className="w-14 rounded border border-border bg-surface px-1.5 py-1 text-right tabular-nums outline-none disabled:opacity-60"
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
                    className="w-20 rounded border border-border bg-surface px-1.5 py-1 text-right tabular-nums outline-none disabled:opacity-60"
                  />
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 flex items-center justify-between text-sm font-semibold">
            <span>Total</span>
            <MoneyValue amount={total} currency={draft.currency} />
          </div>
          {linesWithoutPrice > 0 ? (
            <p className="text-[0.66rem] text-faint">
              {linesWithoutPrice} líneas sin precio (excluidas, no 0).
            </p>
          ) : null}
        </section>

        <section className="rounded-lg border border-border bg-surface/50 p-3">
          <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-faint">
            Vigencia
          </p>
          <input
            type="date"
            disabled={!editable}
            value={draft.validUntil ? draft.validUntil.slice(0, 10) : ""}
            onChange={(e) =>
              onChange({
                validUntil: e.target.value ? new Date(e.target.value).toISOString() : null,
              })
            }
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none disabled:opacity-60"
          />
        </section>

        <section className="flex flex-wrap gap-2">
          {editable ? (
            <button
              type="button"
              onClick={() => setStatus("pendiente-revision", "A revisión")}
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground"
            >
              A revisión
            </button>
          ) : null}
          {draft.status !== "convertido" && draft.status !== "cancelado" ? (
            <button
              type="button"
              onClick={onConvert}
              className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            >
              Convertir (proyección local)
            </button>
          ) : null}
          <button
            type="button"
            onClick={exportDraft}
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground"
          >
            Exportar
          </button>
          {draft.status !== "cancelado" ? (
            <button
              type="button"
              onClick={() => setStatus("cancelado", "Cancelado")}
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground"
            >
              Cancelar
            </button>
          ) : null}
          {draft.status !== "archivado" ? (
            <button
              type="button"
              onClick={() => setStatus("archivado", "Archivado")}
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground"
            >
              Archivar
            </button>
          ) : null}
        </section>
        <p className="text-[0.66rem] text-faint">
          Convertir crea una proyección de pedido local trazable (source manual, sin reserva). No
          crea pedido Shopify, no reserva inventario, no envía correos; exportar no es envío al
          cliente. Un registro con historial se archiva o cancela, no se elimina.
        </p>
      </div>
    </DetailDrawer>
  );
}
