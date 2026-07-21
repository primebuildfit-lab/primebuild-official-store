"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Badge,
  DataTable,
  HonestState,
  SegmentedControl,
  StatusBadge,
  type Column,
  type TabOption,
} from "@/components/ds";
import { useLocalCollection, localId } from "@/lib/local-collection";
import type { PurchaseOrder } from "@/lib/purchase-orders";
import {
  classifyLine,
  pendingFor,
  receiptDiscrepant,
  receivedSoFar,
  totalsByCondition,
  type Receipt,
  type ReceiptCondition,
  type ReceiptLine,
  type ReceiptStatus,
} from "@/lib/receiving";

/**
 * Recepciones (PBOS-001 · ORDEN 10). Receive against a purchase order, partials
 * accumulate, discrepancies and quarantine are recorded, and a closed receipt is
 * immutable. Damaged/quarantined goods never become available. It does NOT update
 * inventory: receiving is recorded as a pending-accounting fact and the canonical
 * stock update belongs to PBOS-INVENTORY-001.
 */

const RECEIVABLE = new Set<PurchaseOrder["status"]>([
  "emitida",
  "confirmada",
  "en-transito",
  "parcialmente-recibida",
]);

const CONDITIONS: ReceiptCondition[] = ["ok", "dañado", "cuarentena", "incorrecto"];

const VIEWS: TabOption[] = [
  { value: "esperadas", label: "Esperadas" },
  { value: "borrador", label: "En proceso" },
  { value: "parcial", label: "Parciales" },
  { value: "con-discrepancias", label: "Con discrepancias" },
  { value: "cuarentena", label: "En cuarentena" },
  { value: "completada", label: "Completadas" },
  { value: "cancelada", label: "Canceladas" },
];

const STATUS_TONE: Record<ReceiptStatus, Parameters<typeof StatusBadge>[0]["tone"]> = {
  borrador: "neutral",
  parcial: "warning",
  "con-discrepancias": "critical",
  completada: "positive",
  cancelada: "neutral",
};

export function ReceivingBoard() {
  const pos = useLocalCollection<PurchaseOrder>("po:list");
  const receipts = useLocalCollection<Receipt>("receiving:list");
  const [view, setView] = useState("esperadas");
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = receipts.items.find((r) => r.id === activeId) ?? null;

  const receivablePos = useMemo(
    () => pos.items.filter((p) => RECEIVABLE.has(p.status)),
    [pos.items],
  );

  function startReceipt(po: PurchaseOrder) {
    const now = new Date().toISOString();
    const lines: ReceiptLine[] = po.lines.map((l) => ({
      id: localId(),
      sku: l.sku,
      title: l.title,
      expected: pendingFor(l.qty, receivedSoFar(receipts.items, po.id, l.sku)),
      received: 0,
      condition: "ok",
    }));
    const receipt: Receipt = {
      id: localId(),
      poId: po.id,
      poNumber: po.number,
      warehouse: po.warehouse || "",
      status: "borrador",
      lines,
      createdAt: now,
      closedAt: null,
    };
    receipts.add(receipt);
    setActiveId(receipt.id);
    setView("borrador");
  }

  const rows = useMemo(() => {
    if (view === "cuarentena")
      return receipts.items.filter((r) => r.lines.some((l) => l.condition === "cuarentena"));
    return receipts.items.filter((r) => r.status === view);
  }, [receipts.items, view]);

  const receiptColumns: Column<Receipt>[] = [
    {
      key: "po",
      header: "OC",
      render: (r) => <span className="font-mono text-xs">{r.poNumber}</span>,
    },
    {
      key: "wh",
      header: "Almacén",
      render: (r) => r.warehouse || <span className="text-faint">—</span>,
    },
    {
      key: "status",
      header: "Estado",
      render: (r) => <StatusBadge label={r.status} tone={STATUS_TONE[r.status]} />,
    },
    { key: "lines", header: "Líneas", align: "right", render: (r) => String(r.lines.length) },
    {
      key: "open",
      header: "",
      align: "right",
      render: (r) => (
        <button
          type="button"
          onClick={() => setActiveId(r.id)}
          className="text-xs text-muted hover:text-foreground"
        >
          Abrir
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {active ? (
        <ReceiptEditor
          key={active.id}
          receipt={active}
          onClose={() => setActiveId(null)}
          onChange={(patch) => receipts.update(active.id, patch)}
        />
      ) : null}

      <SegmentedControl options={VIEWS} value={view} onChange={setView} className="flex-wrap" />

      {view === "esperadas" ? (
        receivablePos.length === 0 ? (
          <HonestState
            icon="inbox"
            title="No hay órdenes por recibir."
            description={
              <>
                Las recepciones parten de una orden de compra emitida/confirmada/en tránsito.{" "}
                <Link href="/purchasing/orders" className="text-accent hover:underline">
                  Ir a Órdenes de compra
                </Link>
                .
              </>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted/40 text-left text-[0.68rem] uppercase tracking-wider text-faint">
                  <th className="px-4 py-2.5 font-semibold">OC</th>
                  <th className="px-4 py-2.5 font-semibold">Proveedor</th>
                  <th className="px-4 py-2.5 font-semibold">Estado</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Líneas</th>
                  <th className="px-4 py-2.5 text-right font-semibold" />
                </tr>
              </thead>
              <tbody>
                {receivablePos.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs">{p.number}</td>
                    <td className="px-4 py-2.5 font-medium">{p.supplier}</td>
                    <td className="px-4 py-2.5">
                      <Badge kind="neutral">{p.status}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{p.lines.length}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => startReceipt(p)}
                        className="rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90"
                      >
                        Recibir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <DataTable
          columns={receiptColumns}
          rows={rows}
          getKey={(r) => r.id}
          emptyMessage="No hay recepciones en esta vista."
          caption={
            <>
              <span>Registro local · no actualiza inventario</span>
              <span className="tabular-nums">{rows.length} recepciones</span>
            </>
          }
        />
      )}
    </div>
  );
}

function ReceiptEditor({
  receipt,
  onClose,
  onChange,
}: {
  receipt: Receipt;
  onClose: () => void;
  onChange: (patch: Partial<Receipt>) => void;
}) {
  const editable = receipt.status === "borrador" || receipt.status === "parcial";
  const totals = totalsByCondition(receipt.lines);

  function updateLine(id: string, patch: Partial<ReceiptLine>) {
    onChange({ lines: receipt.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  }

  function saveDraft() {
    onChange({ status: "parcial" });
  }

  function closeReceipt() {
    const discrepant = receiptDiscrepant(receipt.lines);
    onChange({
      status: discrepant ? "con-discrepancias" : "completada",
      closedAt: new Date().toISOString(),
    });
  }

  function cancel() {
    onChange({ status: "cancelada", closedAt: new Date().toISOString() });
  }

  return (
    <div className="rounded-xl border border-border bg-surface/50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Recepción · {receipt.poNumber}</p>
          <p className="text-xs text-faint">
            Estado: {receipt.status} {receipt.closedAt ? "· cerrada (inmutable)" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted">
            Almacén{" "}
            <input
              value={receipt.warehouse}
              disabled={!editable}
              onChange={(e) => onChange({ warehouse: e.target.value })}
              placeholder="—"
              className="w-28 rounded border border-border bg-surface px-1.5 py-1 text-xs outline-none disabled:opacity-60"
            />
          </label>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted hover:text-foreground"
          >
            Cerrar panel
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted/40 text-left text-[0.66rem] uppercase tracking-wider text-faint">
              <th className="px-2 py-2 font-semibold">SKU</th>
              <th className="px-2 py-2 text-right font-semibold">Esperado</th>
              <th className="px-2 py-2 text-right font-semibold">Recibido</th>
              <th className="px-2 py-2 font-semibold">Estado</th>
              <th className="px-2 py-2 font-semibold">Condición</th>
              <th className="px-2 py-2 font-semibold">Ubicación</th>
              <th className="px-2 py-2 font-semibold">Lote</th>
            </tr>
          </thead>
          <tbody>
            {receipt.lines.map((l) => {
              const cls = classifyLine(l);
              return (
                <tr key={l.id} className="border-b border-border/50 last:border-0">
                  <td className="px-2 py-2">
                    <span className="font-mono text-xs">{l.sku || "—"}</span>
                    {l.title ? <div className="text-[0.66rem] text-muted">{l.title}</div> : null}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{l.expected}</td>
                  <td className="px-2 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      value={l.received}
                      disabled={!editable}
                      onChange={(e) => updateLine(l.id, { received: Number(e.target.value) })}
                      className="w-16 rounded border border-border bg-surface px-1.5 py-1 text-right text-xs tabular-nums outline-none disabled:opacity-60"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Badge
                      kind={
                        cls === "completa" ? "healthy" : cls === "faltante" ? "warning" : "info"
                      }
                    >
                      {cls}
                    </Badge>
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={l.condition}
                      disabled={!editable}
                      onChange={(e) =>
                        updateLine(l.id, { condition: e.target.value as ReceiptCondition })
                      }
                      className="rounded border border-border bg-surface px-1.5 py-1 text-xs outline-none disabled:opacity-60"
                    >
                      {CONDITIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={l.location ?? ""}
                      disabled={!editable}
                      onChange={(e) => updateLine(l.id, { location: e.target.value })}
                      placeholder="—"
                      className="w-24 rounded border border-border bg-surface px-1.5 py-1 text-xs outline-none disabled:opacity-60"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={l.lot ?? ""}
                      disabled={!editable}
                      onChange={(e) => updateLine(l.id, { lot: e.target.value })}
                      placeholder="—"
                      className="w-20 rounded border border-border bg-surface px-1.5 py-1 text-xs outline-none disabled:opacity-60"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
        <span>OK: {totals.ok}</span>
        <span className="text-warn">Dañado: {totals.dañado}</span>
        <span className="text-warn">Cuarentena: {totals.cuarentena}</span>
        <span className="text-warn">Incorrecto: {totals.incorrecto}</span>
      </div>

      {editable ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={saveDraft}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground"
          >
            Guardar borrador (parcial)
          </button>
          <button
            type="button"
            onClick={closeReceipt}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          >
            Cerrar recepción
          </button>
          <button
            type="button"
            onClick={cancel}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-faint">
          Recepción cerrada: es inmutable, no se sobrescribe.
        </p>
      )}

      <p className="mt-2 text-[0.68rem] text-faint">
        No actualiza inventario: la recepción queda como registro operativo pendiente de
        contabilización. La actualización canónica de existencias corresponde a PBOS-INVENTORY-001.
        La mercancía dañada o en cuarentena nunca pasa a disponible.
      </p>
    </div>
  );
}
