/**
 * Pure sales-order logic (PBOS-001 · ORDEN 19). Shopify is a possible external
 * source; importing an order into a local projection is idempotent (a retry never
 * duplicates). The separate lifecycles — order / payment / reservation /
 * fulfillment / return / sync — are kept distinct and never collapsed into one.
 * Payment is observed only. No order is invented; nothing is cancelled remotely.
 */

import type { StoreOrder } from "@/server/integrations/store/store.service";

export const ORDERS_SCHEMA_VERSION = 1;

export type ReservationStatus = "sin-reservar" | "reservado" | "parcial" | "bloqueado" | "liberado";
export type LocalOrderStatus = "nuevo" | "en-espera" | "listo" | "en-proceso" | "cerrado";

export interface OrderNote {
  at: string;
  text: string;
}

export interface SalesOrderProjection {
  id: string;
  source: "shopify" | "manual";
  externalId: string;
  idempotencyKey: string;
  correlationId: string;
  name: string;
  observedAt: string;
  effectiveAt?: string | null;
  currency: string;
  totalObserved: string;
  customerMasked: string | null;
  /** Separate lifecycles — never combined. */
  orderStatus: LocalOrderStatus;
  paymentObserved: string;
  reservationStatus: ReservationStatus;
  fulfillmentObserved: string;
  returnStatus: string;
  syncStatus: "observado" | "importado" | "en-conflicto";
  warehouse?: string;
  notes: OrderNote[];
  history: { at: string; actor: string; action: string }[];
  lastVerifiedAt: string;
}

export function isSalesOrder(x: unknown): x is SalesOrderProjection {
  if (x === null || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.externalId === "string" && typeof o.name === "string";
}

/** Minimise customer data: keep only a masked, human-facing label. */
export function maskCustomer(name: string | null): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (trimmed.includes("@")) {
    const [u, d] = trimmed.split("@");
    return `${(u ?? "").slice(0, 2)}***@${d ?? ""}`;
  }
  const parts = trimmed.split(/\s+/);
  return parts.length > 1
    ? `${parts[0]} ${"*".repeat(Math.min(4, (parts[1] ?? "").length))}`
    : trimmed;
}

/** The idempotency key for a Shopify order import. */
export function importKey(order: Pick<StoreOrder, "id">): string {
  return `shopify:${order.id}`;
}

/**
 * Build the local projection for a Shopify order — idempotent: returns null if an
 * order with the same idempotency key is already imported.
 */
export function importOrder(
  order: StoreOrder,
  existing: SalesOrderProjection[],
  now: string = new Date().toISOString(),
  makeId: () => string = () => `ord_${Math.random().toString(36).slice(2)}`,
): SalesOrderProjection | null {
  const key = importKey(order);
  if (existing.some((o) => o.idempotencyKey === key)) return null;
  return {
    id: makeId(),
    source: "shopify",
    externalId: order.id,
    idempotencyKey: key,
    correlationId: key,
    name: order.name,
    observedAt: order.createdAt,
    currency: order.currency,
    totalObserved: order.total,
    customerMasked: maskCustomer(order.customer),
    orderStatus: "nuevo",
    paymentObserved: order.financialStatus ?? "desconocido",
    reservationStatus: "sin-reservar",
    fulfillmentObserved: order.fulfillmentStatus ?? "sin-preparar",
    returnStatus: "ninguna",
    syncStatus: "importado",
    notes: [],
    history: [{ at: now, actor: "operador-local", action: "Importado (proyección local)" }],
    lastVerifiedAt: now,
  };
}

/**
 * Reservation requires an explicit policy. Without one it is blocked — the app
 * never auto-reserves or invents a policy.
 */
export function canReserve(hasPolicy: boolean): { ok: boolean; reason?: string } {
  if (!hasPolicy) return { ok: false, reason: "Política de reserva no definida" };
  return { ok: true };
}
