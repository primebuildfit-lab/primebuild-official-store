"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, HonestState, Icon, SegmentedControl, type TabOption } from "@/components/ds";
import { useLedger, useLocalCollection, localId } from "@/lib/local-collection";
import {
  INVENTORY_SCHEMA_VERSION,
  deriveBalances,
  isMovement,
  isReceiptPosted,
  postReceiptMovements,
  signedQuantity,
  stockKey,
  type Balance,
  type InventoryMovement,
} from "@/lib/inventory";
import { pendingFor, receivedSoFar, type Receipt } from "@/lib/receiving";
import type { PurchaseOrder } from "@/lib/purchase-orders";

/**
 * Existencias (PBOS-001 · ORDEN 11). The canonical stock view, DERIVED from a
 * local append-only movement ledger — never an editable total. Damaged and
 * quarantined stock are shown apart and never counted as available; the
 * Available formula is "Fórmula no definida" (never a made-up 0). Closed receipts
 * can be posted to the ledger here, idempotently and labelled Workspace local; it
 * never touches Shopify or remote inventory.
 */

const RECEIVABLE = new Set<PurchaseOrder["status"]>([
  "emitida",
  "confirmada",
  "en-transito",
  "parcialmente-recibida",
]);

const VIEWS: TabOption[] = [
  { value: "todo", label: "Todo el inventario" },
  { value: "disponible", label: "Disponible" },
  { value: "agotado", label: "Agotado" },
  { value: "incoming", label: "Incoming" },
  { value: "cuarentena", label: "Cuarentena" },
  { value: "dañado", label: "Dañado" },
  { value: "sin-ubicacion", label: "Sin ubicación" },
  { value: "inconsistencias", label: "Inconsistencias" },
  { value: "comprometido", label: "Comprometido" },
  { value: "en-transito", label: "En tránsito" },
  { value: "bajo", label: "Bajo" },
];

export function InventoryBoard() {
  const ledger = useLedger<InventoryMovement>(
    "inventory:movements",
    INVENTORY_SCHEMA_VERSION,
    isMovement,
  );
  const receipts = useLocalCollection<Receipt>("receiving:list");
  const pos = useLocalCollection<PurchaseOrder>("po:list");

  const [view, setView] = useState("todo");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const balances = useMemo(() => deriveBalances(ledger.entries), [ledger.entries]);

  // Closed receipts not yet posted to the ledger.
  const pendingReceipts = useMemo(
    () =>
      receipts.items.filter(
        (r) =>
          (r.status === "completada" || r.status === "con-discrepancias") &&
          !isReceiptPosted(ledger.entries, r.id),
      ),
    [receipts.items, ledger.entries],
  );

  // Incoming per SKU derived from receivable POs (ordered but not received).
  const incoming = useMemo(() => {
    const map = new Map<string, number>();
    for (const po of pos.items) {
      if (!RECEIVABLE.has(po.status)) continue;
      for (const l of po.lines) {
        const pend = pendingFor(l.qty, receivedSoFar(receipts.items, po.id, l.sku));
        if (pend > 0) map.set(l.sku || "—", (map.get(l.sku || "—") ?? 0) + pend);
      }
    }
    return map;
  }, [pos.items, receipts.items]);

  function postAll() {
    const now = new Date().toISOString();
    const toAppend: InventoryMovement[] = [];
    let existing = ledger.entries;
    for (const r of pendingReceipts) {
      const movements = postReceiptMovements(r, "operador-local", existing, now, localId);
      toAppend.push(...movements);
      existing = [...existing, ...movements];
    }
    if (toAppend.length > 0) ledger.appendMany(toAppend);
  }

  const rows = useMemo(() => {
    switch (view) {
      case "disponible":
        return balances.filter((b) => b.onHand > 0);
      case "agotado":
        return balances.filter((b) => b.onHand <= 0);
      case "cuarentena":
        return balances.filter((b) => b.quarantine > 0);
      case "dañado":
        return balances.filter((b) => b.damaged > 0);
      case "sin-ubicacion":
        return balances.filter((b) =>
          ledger.entries.some(
            (m) => stockKey(m) === b.key && m.warehouseId === b.warehouseId && !m.locationId,
          ),
        );
      case "inconsistencias":
        return balances.filter((b) => b.physical < 0 || b.onHand < 0);
      default:
        return balances;
    }
  }, [view, balances, ledger.entries]);

  const derivedViews = new Set([
    "todo",
    "disponible",
    "agotado",
    "cuarentena",
    "dañado",
    "sin-ubicacion",
    "inconsistencias",
  ]);

  const selected = balances.find((b) => `${b.key}|${b.warehouseId}` === selectedKey) ?? null;

  return (
    <div className="flex flex-col gap-4">
      {/* Contabilización */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface/50 p-3">
        <div className="flex items-center gap-2 text-sm">
          <Badge kind="neutral">Workspace local</Badge>
          <span className="text-muted">
            {pendingReceipts.length > 0
              ? `${pendingReceipts.length} recepciones cerradas pendientes de contabilización.`
              : "Sin recepciones pendientes de contabilización."}
          </span>
        </div>
        <button
          type="button"
          onClick={postAll}
          disabled={pendingReceipts.length === 0}
          title="Contabiliza recepciones cerradas al ledger local (append-only, idempotente). No toca Shopify ni inventario remoto."
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Contabilizar recepciones cerradas
        </button>
      </div>

      <SegmentedControl options={VIEWS} value={view} onChange={setView} className="flex-wrap" />

      {view === "incoming" ? (
        <IncomingView incoming={incoming} />
      ) : !derivedViews.has(view) ? (
        <HonestState
          icon="alert"
          title={`"${VIEWS.find((v) => v.value === view)?.label}" requiere una fuente aún no conectada.`}
          description="Comprometido/reservado requieren pedidos y reservas; En tránsito requiere transferencias despachadas; Bajo requiere una política de reposición. No se inventa un número; se mostrará cuando exista la fuente."
        />
      ) : rows.length === 0 ? (
        <HonestState
          icon="package"
          title="Sin existencias en esta vista."
          description="El inventario se deriva de movimientos publicados. Contabiliza recepciones cerradas o registra movimientos; no hay saldo editable."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/40 text-left text-[0.66rem] uppercase tracking-wider text-faint">
                <th className="px-3 py-2 font-semibold">SKU</th>
                <th className="px-3 py-2 font-semibold">Almacén</th>
                <th className="px-3 py-2 text-right font-semibold">Físico</th>
                <th className="px-3 py-2 text-right font-semibold">Disponible (ok)</th>
                <th className="px-3 py-2 text-right font-semibold">Dañado</th>
                <th className="px-3 py-2 text-right font-semibold">Cuarentena</th>
                <th className="px-3 py-2 text-right font-semibold">Available</th>
                <th className="px-3 py-2 font-semibold">Última actividad</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr
                  key={`${b.key}|${b.warehouseId}`}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="px-3 py-2 font-mono text-xs">{b.key}</td>
                  <td className="px-3 py-2">{b.warehouseId}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{b.physical}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{b.onHand}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-warn">{b.damaged || 0}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-warn">
                    {b.quarantine || 0}
                  </td>
                  <td className="px-3 py-2 text-right text-faint">Fórmula no definida</td>
                  <td className="px-3 py-2 text-xs text-faint">
                    {b.lastActivityAt ? new Date(b.lastActivityAt).toLocaleString("es") : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedKey(`${b.key}|${b.warehouseId}`)}
                      className="text-xs text-muted hover:text-foreground"
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-border/70 px-3 py-2 text-[0.7rem] text-faint">
            <span>Saldo derivado de movimientos publicados · no editable</span>
            <span className="tabular-nums">{rows.length} líneas</span>
          </div>
        </div>
      )}

      {selected ? (
        <BalanceDrawer
          balance={selected}
          movements={ledger.entries.filter(
            (m) => stockKey(m) === selected.key && m.warehouseId === selected.warehouseId,
          )}
          onClose={() => setSelectedKey(null)}
        />
      ) : null}
    </div>
  );
}

function IncomingView({ incoming }: { incoming: Map<string, number> }) {
  const entries = [...incoming.entries()];
  if (entries.length === 0) {
    return (
      <HonestState
        icon="inbox"
        title="Sin incoming."
        description="Incoming se deriva de órdenes de compra emitidas/confirmadas/en tránsito con cantidad pendiente. No hay ninguna."
      />
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-muted/40 text-left text-[0.66rem] uppercase tracking-wider text-faint">
            <th className="px-3 py-2 font-semibold">SKU</th>
            <th className="px-3 py-2 text-right font-semibold">Incoming</th>
            <th className="px-3 py-2 font-semibold">Fuente</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([sku, qty]) => (
            <tr key={sku} className="border-b border-border/50 last:border-0">
              <td className="px-3 py-2 font-mono text-xs">{sku}</td>
              <td className="px-3 py-2 text-right tabular-nums">{qty}</td>
              <td className="px-3 py-2 text-xs text-faint">Órdenes de compra (pendiente)</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BalanceDrawer({
  balance,
  movements,
  onClose,
}: {
  balance: Balance;
  movements: InventoryMovement[];
  onClose: () => void;
}) {
  const actions = [
    { label: "Crear transferencia", href: "/inventory/transfers", icon: "transfer" as const },
    { label: "Iniciar conteo", href: "/inventory/counts", icon: "clipboard-check" as const },
    { label: "Reposición", href: "/inventory/replenishment", icon: "refresh" as const },
    { label: "Abrir Compra rápida", href: "/purchasing/quick-buy", icon: "bolt" as const },
    { label: "Abrir producto", href: "/store/products", icon: "box" as const },
    { label: "Revisar Shopify", href: "/store", icon: "store" as const },
  ];
  return (
    <div className="rounded-xl border border-border bg-surface/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">
            <span className="font-mono">{balance.key}</span> · {balance.warehouseId}
          </p>
          <p className="text-xs text-faint">Saldo derivado · no editable</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted hover:text-foreground"
        >
          Cerrar
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
        <Cell label="Físico" value={String(balance.physical)} />
        <Cell label="Disponible (ok)" value={String(balance.onHand)} />
        <Cell label="Dañado" value={String(balance.damaged)} tone />
        <Cell label="Cuarentena" value={String(balance.quarantine)} tone />
        <Cell label="Reservado" value="No medido" />
        <Cell label="Comprometido" value="No medido" />
        <Cell label="En tránsito" value="No medido" />
        <Cell label="Available" value="Fórmula no definida" />
      </div>
      <p className="mb-4 text-[0.68rem] text-faint">
        Available y Available-to-sell requieren una política de disponibilidad. Cuarentena y dañado
        nunca cuentan como disponibles.
      </p>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {actions.map((a) => (
          <Link
            key={a.href + a.label}
            href={a.href}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted hover:border-border-strong hover:text-foreground"
          >
            <Icon name={a.icon} size={13} />
            {a.label}
          </Link>
        ))}
      </div>

      <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-faint">
        Movimientos ({movements.length})
      </p>
      <ul className="flex flex-col gap-1">
        {movements
          .slice()
          .reverse()
          .map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs"
            >
              <span className="flex items-center gap-2">
                <Badge kind={m.direction === "in" ? "healthy" : "warning"}>{m.movementType}</Badge>
                <span className="text-muted">{m.condition}</span>
              </span>
              <span className="tabular-nums">
                {signedQuantity(m) > 0 ? "+" : ""}
                {signedQuantity(m)}
              </span>
            </li>
          ))}
      </ul>
    </div>
  );
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-2.5 py-1.5">
      <p className="text-[0.62rem] uppercase tracking-wide text-faint">{label}</p>
      <p className={`mt-0.5 tabular-nums ${tone ? "text-warn" : ""}`}>{value}</p>
    </div>
  );
}
