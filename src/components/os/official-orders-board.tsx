"use client";

import { useState } from "react";
import { Panel } from "@/components/ds";
import { localId } from "@/lib/local-collection";
import { INVENTORY_SCHEMA_VERSION, type InventoryMovement } from "@/lib/inventory";
import { transitionReservation } from "@/lib/owned-inventory";
import { orderTotals, transitionOrder, type OfficialOrderState, type PrimeBuildOfficialOrder } from "@/lib/storefront";
import {
  useMovements,
  useOfficialOrders,
  useReservations,
  useStoreEvents,
} from "@/lib/official-store-data";
import { formatPb, formatUsd } from "@/lib/pb-exchange/pb-exchange-sdk";

/**
 * Bandeja de pedidos de la Official Store (§48-§49). Las transiciones exigen
 * evidencia observada para pagos/reembolsos; ENVIAR contabiliza la salida en
 * el ledger append-only (idempotente por pedido) y convierte la reserva.
 * Cancelar libera la reserva. Nada toca Shopify ni CoinOS.
 */
export function OfficialOrdersBoard() {
  const orders = useOfficialOrders();
  const reservations = useReservations();
  const movements = useMovements();
  const { emit } = useStoreEvents();
  const [refInput, setRefInput] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const doTransition = (
    order: PrimeBuildOfficialOrder,
    to: OfficialOrderState,
    needsRef = false,
  ) => {
    setNotice(null);
    const now = new Date().toISOString();
    const reference = (refInput[order.id] ?? "").trim();
    const result = transitionOrder(
      order,
      to,
      "official-store-admin",
      now,
      needsRef ? { reference, observedAt: now, method: order.paymentChoice ?? "USD" } : undefined,
    );
    if (!result.ok) {
      setNotice(result.detail);
      return;
    }

    if (to === "Shipped") {
      // Salida del ledger, idempotente por pedido (correlationId = orderId).
      const alreadyPosted = movements.entries.some((m) => m.correlationId === order.id);
      if (!alreadyPosted) {
        const out: InventoryMovement[] = order.items.map((it) => ({
          id: localId(),
          movementType: "ajuste-negativo",
          sku: it.sku,
          productId: it.productId,
          warehouseId: it.warehouseId,
          quantity: it.quantity,
          unit: "unidad",
          condition: "ok",
          direction: "out",
          sourceType: "pedido-official-store",
          sourceId: order.id,
          correlationId: order.id,
          actor: "official-store-admin",
          reason: `Envío del pedido ${order.id}`,
          occurredAt: now,
          recordedAt: now,
          status: "publicado",
          version: INVENTORY_SCHEMA_VERSION,
        }));
        movements.appendMany(out);
      }
      const r = reservations.items.find((x) => x.id === order.reservationId);
      if (r) {
        const converted = transitionReservation(r, "Converted", now);
        if (converted) reservations.update(r.id, converted);
      }
      emit("official_order.shipped", { orderId: order.id }, `ship:${order.id}`);
    }
    if (to === "Cancelled") {
      const r = reservations.items.find((x) => x.id === order.reservationId);
      if (r && (r.status === "Active" || r.status === "Extended")) {
        const released = transitionReservation(r, "Released", now);
        if (released) reservations.update(r.id, released);
        emit("official_inventory.released", { reservationId: r.id }, `release:${r.id}`);
      }
    }
    if (to === "Paid observed") emit("official_order.payment_observed", { orderId: order.id }, `pay:${order.id}`);
    if (to === "Picking") emit("official_order.fulfillment_started", { orderId: order.id }, `pick:${order.id}`);
    if (to === "Delivered") emit("official_order.delivered", { orderId: order.id }, `deliver:${order.id}`);

    orders.update(order.id, result.order);
  };

  const ACTIONS: Partial<Record<OfficialOrderState, { to: OfficialOrderState; label: string; needsRef?: boolean }[]>> = {
    "Awaiting payment": [
      { to: "Paid observed", label: "Registrar pago observado", needsRef: true },
      { to: "Cancelled", label: "Cancelar" },
    ],
    "Payment authorized observed": [
      { to: "Paid observed", label: "Confirmar pago observado", needsRef: true },
      { to: "Cancelled", label: "Cancelar" },
    ],
    "Paid observed": [
      { to: "Picking", label: "Iniciar picking" },
      { to: "Cancelled", label: "Cancelar" },
    ],
    Picking: [{ to: "Packed", label: "Marcar empacado" }],
    Packed: [{ to: "Shipped", label: "Enviar (descuenta ledger)" }],
    Shipped: [{ to: "Delivered", label: "Marcar entregado" }],
    "Return requested": [{ to: "Returned", label: "Recepcionar devolución" }],
    Returned: [{ to: "Refund observed", label: "Registrar reembolso observado", needsRef: true }],
  };

  return (
    <div className="flex flex-col gap-6">
      {notice ? (
        <p className="rounded-lg border border-warn/50 bg-warn/10 px-4 py-2 text-sm text-warn">{notice}</p>
      ) : null}
      <Panel icon="receipt" title={`Pedidos (${orders.items.length})`}>
        {orders.items.length === 0 ? (
          <p className="text-sm text-muted">
            Sin pedidos del storefront todavía. Los pedidos creados en /shop aparecen aquí.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {[...orders.items]
              .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
              .map((o) => {
                const t = orderTotals(o.items);
                const actions = ACTIONS[o.state] ?? [];
                const needsRef = actions.some((a) => a.needsRef);
                return (
                  <div key={o.id} className="rounded-xl border border-border bg-surface-muted/30 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs text-faint">{o.id}</p>
                        <p className="text-sm">
                          {t.itemsCount} uds · {formatPb(t.pbTotalDisplay)}{" "}
                          <span className="text-muted">≈ {formatUsd(t.vnTotalUsd)}</span> · pago{" "}
                          {o.paymentChoice}
                        </p>
                        <p className="text-xs text-muted">
                          {o.address ? `${o.address.name} — ${o.address.city}, ${o.address.country}` : "Sin dirección"}
                          {o.reservationId ? ` · reserva ${o.reservationId}` : ""}
                        </p>
                      </div>
                      <span className="rounded-full border border-border px-3 py-1 text-xs">{o.state}</span>
                    </div>
                    {(actions.length > 0 || needsRef) && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                        {needsRef ? (
                          <input
                            value={refInput[o.id] ?? ""}
                            onChange={(e) => setRefInput((p) => ({ ...p, [o.id]: e.target.value }))}
                            placeholder="Referencia observada (obligatoria)"
                            className="rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-xs"
                          />
                        ) : null}
                        {actions.map((a) => (
                          <button
                            key={a.to}
                            onClick={() => doTransition(o, a.to, a.needsRef)}
                            className="rounded-lg border border-border px-3 py-1.5 text-xs hover:border-accent"
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </Panel>
    </div>
  );
}
