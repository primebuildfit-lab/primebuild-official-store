"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Badge,
  DetailDrawer,
  ExternalLinkAction,
  HonestState,
  SegmentedControl,
  type TabOption,
} from "@/components/ds";
import { useVersionedCollection, localId } from "@/lib/local-collection";
import { isWarehouse, WAREHOUSE_SCHEMA_VERSION, type Warehouse } from "@/lib/warehouses";
import {
  ORDERS_SCHEMA_VERSION,
  canReserve,
  importOrder,
  importKey,
  isSalesOrder,
  type SalesOrderProjection,
} from "@/lib/orders";
import type { StoreOrder } from "@/server/integrations/store/store.service";

/**
 * Pedidos (PBOS-001 · ORDEN 19). The sales-order inbox. Shopify is a possible
 * external source; importing is idempotent into a local projection. The order /
 * payment / reservation / fulfillment / return / sync lifecycles are shown
 * separately. Payment is observed only; reservation is blocked without a policy;
 * remote actions (cancel, remote fulfillment) are blocked. No order is invented.
 */

const VIEWS: TabOption[] = [
  { value: "todos", label: "Todos" },
  { value: "nuevos", label: "Nuevos" },
  { value: "sin-reservar", label: "Sin reservar" },
  { value: "en-espera", label: "Bloqueados" },
  { value: "devueltos", label: "Devueltos" },
  { value: "conflicto", label: "Con conflicto Shopify" },
];

export function OrdersInbox({
  connected,
  shopifyOrders,
}: {
  connected: boolean;
  shopifyOrders: StoreOrder[];
}) {
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
  const [view, setView] = useState("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = orders.items.find((o) => o.id === selectedId) ?? null;

  const importedKeys = useMemo(
    () => new Set(orders.items.map((o) => o.idempotencyKey)),
    [orders.items],
  );

  function doImport(order: StoreOrder) {
    const projection = importOrder(order, orders.items, undefined, localId);
    if (projection) orders.add(projection);
  }

  const rows = useMemo(() => {
    switch (view) {
      case "nuevos":
        return orders.items.filter((o) => o.orderStatus === "nuevo");
      case "sin-reservar":
        return orders.items.filter((o) => o.reservationStatus === "sin-reservar");
      case "en-espera":
        return orders.items.filter((o) => o.orderStatus === "en-espera");
      case "devueltos":
        return orders.items.filter((o) => o.returnStatus !== "ninguna");
      case "conflicto":
        return orders.items.filter((o) => o.syncStatus === "en-conflicto");
      default:
        return orders.items;
    }
  }, [orders.items, view]);

  return (
    <div>
      {/* Shopify observed orders (import source) */}
      {connected ? (
        <div className="mb-4 rounded-xl border border-border bg-surface/50 p-3">
          <p className="mb-2 text-xs font-semibold text-muted">
            Pedidos observados en Shopify (importación idempotente)
          </p>
          {shopifyOrders.length === 0 ? (
            <p className="text-xs text-faint">La tienda no tiene pedidos recientes.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {shopifyOrders.map((o) => {
                const already = importedKeys.has(importKey(o));
                return (
                  <li key={o.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-mono text-xs">{o.name}</span>
                    <span className="text-xs text-muted">
                      {o.total} {o.currency} · pago {o.financialStatus ?? "?"}
                    </span>
                    <button
                      type="button"
                      onClick={() => doImport(o)}
                      disabled={already}
                      className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted hover:text-foreground disabled:opacity-50"
                    >
                      {already ? "Importado" : "Importar (borrador local)"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="mb-4">
          <HonestState
            icon="plug"
            tone="warn"
            title="Shopify no conectado — sin pedidos."
            description="No se inventan pedidos ni se crean fixtures. Conecta la tienda para observar e importar pedidos; el contrato y la configuración están disponibles arriba."
          />
        </div>
      )}

      <SegmentedControl
        options={VIEWS}
        value={view}
        onChange={setView}
        className="mb-4 flex-wrap"
      />

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface/40 p-8 text-center text-sm text-muted">
          Sin pedidos importados en esta vista.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/40 text-left text-[0.64rem] uppercase tracking-wider text-faint">
                <th className="px-3 py-2 font-semibold">Pedido</th>
                <th className="px-3 py-2 font-semibold">Pago (observado)</th>
                <th className="px-3 py-2 font-semibold">Reserva</th>
                <th className="px-3 py-2 font-semibold">Fulfillment</th>
                <th className="px-3 py-2 font-semibold">Sync</th>
                <th className="px-3 py-2 text-right font-semibold">Total</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-b border-border/50 last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{o.name}</td>
                  <td className="px-3 py-2">
                    <Badge kind="neutral">{o.paymentObserved}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Badge kind={o.reservationStatus === "sin-reservar" ? "warning" : "neutral"}>
                      {o.reservationStatus}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">{o.fulfillmentObserved}</td>
                  <td className="px-3 py-2 text-xs text-faint">{o.syncStatus}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {o.totalObserved} {o.currency}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedId(o.id)}
                      className="text-xs text-muted hover:text-foreground"
                    >
                      Abrir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected ? (
        <OrderDrawer
          key={selected.id}
          order={selected}
          warehouses={warehouses.items}
          onClose={() => setSelectedId(null)}
          onChange={(patch) => orders.update(selected.id, patch)}
        />
      ) : null}
    </div>
  );
}

function OrderDrawer({
  order,
  warehouses,
  onClose,
  onChange,
}: {
  order: SalesOrderProjection;
  warehouses: Warehouse[];
  onClose: () => void;
  onChange: (patch: Partial<SalesOrderProjection>) => void;
}) {
  const [note, setNote] = useState("");
  const reserve = canReserve(false); // no reservation policy store exists yet

  function addNote() {
    if (!note.trim()) return;
    onChange({ notes: [...order.notes, { at: new Date().toISOString(), text: note.trim() }] });
    setNote("");
  }

  return (
    <DetailDrawer
      open
      onClose={onClose}
      title={order.name}
      description="Proyección local de pedido"
    >
      <div className="flex flex-col gap-5">
        <section className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Origen" value={order.source} />
          <Field label="External ID" value={order.externalId} mono />
          <Field label="Pedido" value={order.orderStatus} />
          <Field label="Pago (observado)" value={order.paymentObserved} />
          <Field label="Reserva" value={order.reservationStatus} />
          <Field label="Fulfillment (observado)" value={order.fulfillmentObserved} />
          <Field label="Devolución" value={order.returnStatus} />
          <Field label="Sync" value={order.syncStatus} />
          <Field label="Cliente" value={order.customerMasked ?? "—"} />
          <Field label="Total (observado)" value={`${order.totalObserved} ${order.currency}`} />
        </section>

        <section className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-xs text-muted">
            Almacén asignado
            <select
              value={order.warehouse ?? ""}
              onChange={(e) => onChange({ warehouse: e.target.value || undefined })}
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none"
            >
              <option value="">—</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.code}>
                  {w.code}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled
              title={reserve.reason}
              className="cursor-not-allowed rounded-lg border border-border px-2.5 py-1.5 text-xs text-faint opacity-60"
            >
              Preparar reserva — {reserve.reason}
            </button>
            <button
              type="button"
              onClick={() =>
                onChange({ orderStatus: order.orderStatus === "en-espera" ? "nuevo" : "en-espera" })
              }
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground"
            >
              {order.orderStatus === "en-espera" ? "Quitar espera" : "Poner en espera"}
            </button>
            <Link
              href="/operations/fulfillment"
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground"
            >
              Borrador de preparación
            </Link>
            <ExternalLinkAction
              href={null}
              system="Shopify"
              disabledReason="URL de Shopify no verificada"
            >
              Abrir en Shopify
            </ExternalLinkAction>
          </div>
        </section>

        <section>
          <p className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-faint">
            Notas internas
          </p>
          <div className="mb-2 flex gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nota interna"
              className="flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none"
            />
            <button
              type="button"
              onClick={addNote}
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground"
            >
              Añadir
            </button>
          </div>
          {order.notes.length === 0 ? (
            <p className="text-xs text-faint">Sin notas.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-xs text-muted">
              {order.notes.map((n, i) => (
                <li key={i}>
                  {new Date(n.at).toLocaleString("es")} · {n.text}
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-[0.66rem] text-faint">
          El estado de pago es observado; no se cambia manualmente como verdad. No se cancela ni se
          hace fulfillment remoto. Datos de cliente minimizados.
        </p>
      </div>
    </DetailDrawer>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-2.5 py-1.5">
      <p className="text-[0.62rem] uppercase tracking-wide text-faint">{label}</p>
      <p className={`mt-0.5 ${mono ? "font-mono text-[0.7rem]" : ""}`}>{value}</p>
    </div>
  );
}
