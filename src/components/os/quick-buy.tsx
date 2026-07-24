"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Badge,
  BulkActionBar,
  Icon,
  MoneyValue,
  UnsavedChangesBar,
  type BulkAction,
} from "@/components/ds";
import { useLocalCollection, localId } from "@/lib/local-collection";
import {
  groupTotals,
  lineSubtotal,
  parsePaste,
  validateLine,
  type PurchaseUnit,
  type QuickBuyDraft,
  type QuickBuyLine,
} from "@/lib/quick-buy";
import type { StoreProduct } from "@/server/integrations/store/store.service";

/**
 * Compra rápida (PBOS-001 · ORDEN 7) — the manual-first purchase planner. It adds
 * real products, accepts pasted SKUs (unknown ones are flagged, never turned into
 * products), validates MOQ/multiples per line, totals by supplier and warehouse
 * without mixing currencies, and saves/reopens drafts LOCALLY. Saving a draft
 * sends nothing, contacts no supplier, and changes no inventory or Shopify.
 */

const UNITS: PurchaseUnit[] = ["unidad", "paquete", "caja", "pallet"];

function numOrNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function QuickBuy({
  products,
  connected,
}: {
  products: StoreProduct[];
  connected: boolean;
}) {
  const drafts = useLocalCollection<QuickBuyDraft>("quickbuy:drafts");

  const [name, setName] = useState("Compra rápida");
  const [warehouse, setWarehouse] = useState("");
  const [status, setStatus] = useState<QuickBuyDraft["status"]>("borrador");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [lines, setLines] = useState<QuickBuyLine[]>([]);
  const [dirty, setDirty] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [paste, setPaste] = useState("");
  const [pasteNote, setPasteNote] = useState<string | null>(null);

  const past = useRef<QuickBuyLine[][]>([]);
  const future = useRef<QuickBuyLine[][]>([]);

  function commit(next: QuickBuyLine[]) {
    past.current.push(lines);
    future.current = [];
    setLines(next);
    setDirty(true);
  }
  function undo() {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(lines);
    setLines(prev);
    setDirty(true);
  }
  function redo() {
    const nxt = future.current.pop();
    if (!nxt) return;
    past.current.push(lines);
    setLines(nxt);
    setDirty(true);
  }

  function addProduct(p: StoreProduct) {
    commit([
      ...lines,
      {
        id: localId(),
        sku: "",
        title: p.title,
        recognized: true,
        warehouse: warehouse || undefined,
        unit: "unidad",
        qty: 1,
        moq: null,
        multiple: null,
        unitCost: Number(p.price) || null,
        currency: p.currency,
      },
    ]);
  }

  function processPaste() {
    const parsed = parsePaste(paste);
    if (parsed.length === 0) {
      setPasteNote("No se reconoció ninguna fila.");
      return;
    }
    commit([
      ...lines,
      ...parsed.map((row) => ({
        id: localId(),
        sku: row.sku,
        recognized: false,
        warehouse: warehouse || undefined,
        unit: "unidad" as PurchaseUnit,
        qty: row.qty,
        moq: null,
        multiple: null,
        unitCost: null,
        currency: null,
      })),
    ]);
    setPaste("");
    setPasteNote(
      `${parsed.length} líneas añadidas. Ningún SKU se reconoció contra un catálogo (no hay catálogo de SKU): se conservan como no reconocidas, sin crear productos.`,
    );
  }

  function updateLine(id: string, patch: Partial<QuickBuyLine>) {
    commit(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeSelected() {
    commit(lines.filter((l) => !selected.has(l.id)));
    setSelected(new Set());
  }

  function saveDraft() {
    const payload: QuickBuyDraft = {
      id: draftId ?? localId(),
      name: name.trim() || "Compra rápida",
      warehouse,
      status,
      lines,
      updatedAt: new Date().toISOString(),
    };
    if (draftId) drafts.update(draftId, payload);
    else {
      drafts.add(payload);
      setDraftId(payload.id);
    }
    setDirty(false);
  }

  function loadDraft(d: QuickBuyDraft) {
    past.current = [];
    future.current = [];
    setDraftId(d.id);
    setName(d.name);
    setWarehouse(d.warehouse);
    setStatus(d.status);
    setLines(d.lines);
    setDirty(false);
    setSelected(new Set());
  }

  function newDraft() {
    past.current = [];
    future.current = [];
    setDraftId(null);
    setName("Compra rápida");
    setWarehouse("");
    setStatus("borrador");
    setLines([]);
    setDirty(false);
    setSelected(new Set());
  }

  function exportDraft() {
    const blob = new Blob(
      [
        JSON.stringify(
          { name, warehouse, status, lines, exportedAt: new Date().toISOString() },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/\s+/g, "-").toLowerCase()}-compra-rapida.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const supplierTotals = useMemo(() => groupTotals(lines, "supplier"), [lines]);
  const warehouseTotals = useMemo(() => groupTotals(lines, "warehouse"), [lines]);
  const linesWithoutCost = lines.filter((l) => lineSubtotal(l) == null).length;

  const bulkActions: BulkAction[] = [
    { id: "del", label: "Eliminar seleccionadas", onRun: removeSelected, tone: "danger" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-surface/50 p-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Borrador
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setDirty(true);
            }}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Almacén por defecto
          <input
            value={warehouse}
            onChange={(e) => {
              setWarehouse(e.target.value);
              setDirty(true);
            }}
            placeholder="p. ej. Principal"
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={undo}
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground"
            title="Deshacer"
          >
            <Icon name="arrow-up" size={14} />
          </button>
          <button
            type="button"
            onClick={redo}
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground"
            title="Rehacer"
          >
            <Icon name="arrow-down" size={14} />
          </button>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Badge kind={status === "listo-aprobacion" ? "info" : "neutral"}>
            {status === "listo-aprobacion" ? "Listo para aprobación" : "Borrador"}
          </Badge>
          <button
            type="button"
            onClick={exportDraft}
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted hover:text-foreground"
          >
            Exportar
          </button>
          <button
            type="button"
            onClick={newDraft}
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted hover:text-foreground"
          >
            Nuevo
          </button>
          <button
            type="button"
            onClick={saveDraft}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          >
            Guardar borrador
          </button>
        </div>
      </div>

      {/* Saved drafts */}
      {drafts.items.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-faint">Reabrir:</span>
          {drafts.items.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => loadDraft(d)}
              className={`rounded-full border px-2.5 py-1 font-medium transition-colors ${
                d.id === draftId
                  ? "border-primary/40 bg-primary/15 text-accent"
                  : "border-border bg-surface text-muted hover:text-foreground"
              }`}
            >
              {d.name} · {d.lines.length}
            </button>
          ))}
        </div>
      ) : null}

      {/* Add product + paste */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface/50 p-3">
          <p className="mb-2 text-xs font-semibold text-muted">Añadir producto real</p>
          {!connected || products.length === 0 ? (
            <p className="text-xs text-faint">
              {connected ? "La tienda no tiene productos." : "Tienda no conectada."} No se inventan
              productos.{" "}
              <Link href="/store/products" className="text-accent hover:underline">
                Abrir Productos
              </Link>
              .
            </p>
          ) : (
            <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
              {products.slice(0, 40).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addProduct(p)}
                  className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-muted hover:border-border-strong hover:text-foreground"
                >
                  + {p.title}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-border bg-surface/50 p-3">
          <p className="mb-2 text-xs font-semibold text-muted">
            Pegar SKUs (SKU cantidad por línea)
          </p>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={2}
            aria-label="Pegar SKUs"
            placeholder={"ABC-1\t10\nDEF-2\t24"}
            className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="mt-1.5 flex items-center gap-2">
            <button
              type="button"
              onClick={processPaste}
              className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted hover:text-foreground"
            >
              Procesar pegado
            </button>
            {pasteNote ? <span className="text-[0.68rem] text-faint">{pasteNote}</span> : null}
          </div>
        </div>
      </div>

      {selected.size > 0 ? (
        <BulkActionBar
          count={selected.size}
          actions={bulkActions}
          onClear={() => setSelected(new Set())}
        />
      ) : null}

      {/* Grid */}
      {lines.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/40 p-10 text-center text-sm text-muted">
          Cuadrícula vacía. Añade productos reales o pega SKUs. Guardar no envía nada al proveedor
          ni modifica el inventario.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/40 text-left text-[0.66rem] uppercase tracking-wider text-faint">
                <th className="px-2 py-2" />
                <th className="px-2 py-2 font-semibold">SKU / Producto</th>
                <th className="px-2 py-2 font-semibold">Unidad</th>
                <th className="px-2 py-2 text-right font-semibold">Cant.</th>
                <th className="px-2 py-2 text-right font-semibold">MOQ</th>
                <th className="px-2 py-2 text-right font-semibold">Múltiplo</th>
                <th className="px-2 py-2 text-right font-semibold">Costo unit.</th>
                <th className="px-2 py-2 font-semibold">Proveedor</th>
                <th className="px-2 py-2 font-semibold">Almacén</th>
                <th className="px-2 py-2 text-right font-semibold">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const errs = validateLine(l);
                const sub = lineSubtotal(l);
                return (
                  <tr key={l.id} className="border-b border-border/50 align-top last:border-0">
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(l.id)}
                        onChange={(e) => {
                          const next = new Set(selected);
                          if (e.target.checked) next.add(l.id);
                          else next.delete(l.id);
                          setSelected(next);
                        }}
                        aria-label="Seleccionar línea"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        value={l.sku}
                        onChange={(e) => updateLine(l.id, { sku: e.target.value })}
                        placeholder="SKU"
                        className="w-28 rounded border border-border bg-surface px-1.5 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <div className="mt-0.5 flex items-center gap-1">
                        {l.title ? (
                          <span className="text-[0.68rem] text-muted">{l.title}</span>
                        ) : null}
                        {!l.recognized ? (
                          <span className="text-[0.6rem] uppercase tracking-wide text-warn">
                            no reconocido
                          </span>
                        ) : null}
                      </div>
                      {errs.length > 0 ? (
                        <div className="mt-0.5 text-[0.66rem] text-warn">{errs.join(" ")}</div>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={l.unit}
                        onChange={(e) => updateLine(l.id, { unit: e.target.value as PurchaseUnit })}
                        className="rounded border border-border bg-surface px-1.5 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <input
                        type="number"
                        value={l.qty}
                        min={0}
                        onChange={(e) => updateLine(l.id, { qty: Number(e.target.value) })}
                        className="w-16 rounded border border-border bg-surface px-1.5 py-1 text-right text-xs tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <input
                        type="number"
                        value={l.moq ?? ""}
                        onChange={(e) => updateLine(l.id, { moq: numOrNull(e.target.value) })}
                        className="w-14 rounded border border-border bg-surface px-1.5 py-1 text-right text-xs tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <input
                        type="number"
                        value={l.multiple ?? ""}
                        onChange={(e) => updateLine(l.id, { multiple: numOrNull(e.target.value) })}
                        className="w-14 rounded border border-border bg-surface px-1.5 py-1 text-right text-xs tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <input
                        type="number"
                        value={l.unitCost ?? ""}
                        placeholder="—"
                        onChange={(e) => updateLine(l.id, { unitCost: numOrNull(e.target.value) })}
                        className="w-20 rounded border border-border bg-surface px-1.5 py-1 text-right text-xs tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        value={l.supplier ?? ""}
                        onChange={(e) => updateLine(l.id, { supplier: e.target.value })}
                        placeholder="—"
                        className="w-24 rounded border border-border bg-surface px-1.5 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        value={l.warehouse ?? ""}
                        onChange={(e) => updateLine(l.id, { warehouse: e.target.value })}
                        placeholder="—"
                        className="w-24 rounded border border-border bg-surface px-1.5 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {sub == null ? (
                        <span className="text-faint">No medido</span>
                      ) : (
                        <MoneyValue amount={sub} currency={l.currency} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Totals */}
      {lines.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <TotalsCard title="Totales por proveedor" totals={supplierTotals} />
          <TotalsCard title="Totales por almacén" totals={warehouseTotals} />
        </div>
      ) : null}

      {linesWithoutCost > 0 ? (
        <p className="text-xs text-faint">
          {linesWithoutCost} líneas sin costo conocido: se excluyen del subtotal (no se asume 0).
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setStatus("listo-aprobacion");
            setDirty(true);
          }}
          disabled={lines.length === 0}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          Marcar listo para aprobación
        </button>
        <button
          type="button"
          disabled
          title="La conversión a órdenes de compra se realiza desde Órdenes de compra. No envía nada a proveedores."
          className="cursor-not-allowed rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-faint opacity-60"
        >
          Convertir a órdenes de compra
        </button>
        <span className="text-[0.68rem] text-faint">
          Guardar/exportar es local: no envía órdenes, no contacta proveedores, no cambia inventario
          ni Shopify.
        </span>
      </div>

      <UnsavedChangesBar
        visible={dirty}
        onSave={saveDraft}
        onDiscard={draftId ? undefined : newDraft}
      />
    </div>
  );
}

function TotalsCard({ title, totals }: { title: string; totals: ReturnType<typeof groupTotals> }) {
  return (
    <div className="rounded-xl border border-border">
      <p className="border-b border-border/70 px-3 py-2 text-xs font-semibold text-muted">
        {title}
      </p>
      {totals.length === 0 ? (
        <p className="px-3 py-3 text-xs text-faint">Sin líneas.</p>
      ) : (
        <ul className="divide-y divide-border/50">
          {totals.map((t) => (
            <li
              key={`${t.group}-${t.currency}`}
              className="flex items-center justify-between px-3 py-2 text-sm"
            >
              <span className="text-muted">
                {t.group} · {t.currency}
                {t.linesWithoutCost > 0 ? (
                  <span className="ml-1 text-[0.66rem] text-faint">
                    ({t.linesWithoutCost} sin costo)
                  </span>
                ) : null}
              </span>
              <span className="tabular-nums">
                {t.currency === "Sin moneda" ? (
                  <span className="text-faint">No medido</span>
                ) : (
                  <MoneyValue amount={t.subtotal} currency={t.currency} />
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
