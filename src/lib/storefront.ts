/**
 * Storefront de la Official Store — carrito, checkout y pedidos
 * (PBOS-DPB-MEGA-FABLE-001 §45-§48).
 *
 * El Client consume el catálogo publicado y el inventario derivado; no tiene
 * autoridad sobre su configuración (AP-4.2/AP-4.3). Sin proveedor financiero
 * no se procesa dinero real: el pago PB queda como quote y el pago USD como
 * observación. Ningún pedido se marca pagado o reembolsado sin evidencia.
 */

import type { PriceQuote } from "./store-pricing";

export const STOREFRONT_SCHEMA_VERSION = 1;

/* ───────────────────────── Carrito §45 ───────────────────────── */

export interface CartLine {
  id: string;
  productId: string;
  variantId: string;
  title: string;
  variantTitle: string;
  sku?: string;
  warehouseId: string;
  quantity: number;
  priceQuote: PriceQuote;
  addedAt: string;
}

export interface CartValidationIssue {
  lineId: string;
  kind: "OVER_AVAILABLE" | "QUOTE_EXPIRED" | "NOT_VISIBLE";
  detail: string;
}

/**
 * Valida cantidades del carrito contra el disponible REAL por línea.
 * quantity > available ⇒ inválido (§45); el storefront nunca deja pasar al
 * checkout un carrito con líneas sobre-disponibles.
 */
export function validateCartQuantities(
  lines: CartLine[],
  availabilityByKeyWarehouse: (key: string, warehouseId: string) => number,
): CartValidationIssue[] {
  const issues: CartValidationIssue[] = [];
  // Suma por línea de stock (varias líneas de carrito pueden compartir SKU).
  const wanted = new Map<string, { total: number; lineIds: string[] }>();
  for (const l of lines) {
    const key = l.sku && l.sku.trim() ? l.sku.trim() : l.productId;
    const slot = `${key}|||${l.warehouseId}`;
    const w = wanted.get(slot) ?? { total: 0, lineIds: [] };
    w.total += l.quantity;
    w.lineIds.push(l.id);
    wanted.set(slot, w);
  }
  for (const [slot, w] of wanted) {
    const sepIndex = slot.indexOf("|||");
    const key = slot.slice(0, sepIndex);
    const warehouseId = slot.slice(sepIndex + 3);
    const available = availabilityByKeyWarehouse(key, warehouseId);
    if (w.total > available) {
      for (const lineId of w.lineIds) {
        issues.push({
          lineId,
          kind: "OVER_AVAILABLE",
          detail: `Se piden ${w.total} de ${key} y hay ${available} disponible.`,
        });
      }
    }
  }
  return issues;
}

/* ───────────────────────── Checkout §46 ───────────────────────── */

export const CHECKOUT_STEPS = [
  "cart",
  "inventory_validation",
  "address",
  "shipping",
  "payment_choice",
  "quote_preview",
  "review",
  "confirmation",
] as const;
export type CheckoutStep = (typeof CHECKOUT_STEPS)[number];

/** El checkout avanza en orden; no se salta la validación de inventario. */
export function nextCheckoutStep(step: CheckoutStep): CheckoutStep | null {
  const i = CHECKOUT_STEPS.indexOf(step);
  return i >= 0 && i < CHECKOUT_STEPS.length - 1 ? CHECKOUT_STEPS[i + 1]! : null;
}

export type PaymentChoice = "PB" | "USD";

/* ───────────────────────── Pedidos §48 ───────────────────────── */

export const OFFICIAL_ORDER_STATES = [
  "Draft",
  "Awaiting payment",
  "Payment authorized observed",
  "Paid observed",
  "Picking",
  "Packed",
  "Shipped",
  "Delivered",
  "Return requested",
  "Returned",
  "Cancelled",
  "Refund observed",
  "Unknown",
] as const;
export type OfficialOrderState = (typeof OFFICIAL_ORDER_STATES)[number];

const ORDER_TRANSITIONS: Record<OfficialOrderState, OfficialOrderState[]> = {
  Draft: ["Awaiting payment", "Cancelled"],
  "Awaiting payment": ["Payment authorized observed", "Paid observed", "Cancelled"],
  "Payment authorized observed": ["Paid observed", "Cancelled"],
  "Paid observed": ["Picking", "Cancelled"],
  Picking: ["Packed", "Cancelled"],
  Packed: ["Shipped", "Cancelled"],
  Shipped: ["Delivered"],
  Delivered: ["Return requested"],
  "Return requested": ["Returned", "Delivered"],
  Returned: ["Refund observed"],
  Cancelled: [],
  "Refund observed": [],
  Unknown: [],
};

export interface OrderItem {
  id: string;
  productId: string;
  variantId: string;
  title: string;
  variantTitle: string;
  sku?: string;
  warehouseId: string;
  quantity: number;
  /** Snapshot del precio en el momento del pedido (§38). */
  priceQuote: PriceQuote;
}

export interface PaymentEvidence {
  /** Referencia observada (proveedor/registro externo); sin ella no hay pago. */
  reference: string;
  observedAt: string;
  method: PaymentChoice;
  note?: string;
}

export interface PrimeBuildOfficialOrder {
  id: string;
  state: OfficialOrderState;
  items: OrderItem[];
  reservationId?: string;
  paymentChoice?: PaymentChoice;
  paymentEvidence?: PaymentEvidence;
  refundEvidence?: PaymentEvidence;
  address?: { name: string; line1: string; city: string; country: string; postal: string };
  shipping?: { method: string; estimateDays?: number; costUsd?: string };
  history: { at: string; from: OfficialOrderState; to: OfficialOrderState; actor: string; note?: string }[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

export type OrderTransitionResult =
  | { ok: true; order: PrimeBuildOfficialOrder }
  | { ok: false; reason: "ILLEGAL_TRANSITION" | "EVIDENCE_REQUIRED"; detail: string };

/**
 * Transición de pedido con guardas de evidencia: «Paid observed»,
 * «Payment authorized observed» y «Refund observed» EXIGEN referencia
 * observada (§48). Ninguna transición se salta pasos.
 */
export function transitionOrder(
  order: PrimeBuildOfficialOrder,
  to: OfficialOrderState,
  actor: string,
  nowIso: string,
  evidence?: PaymentEvidence,
  note?: string,
): OrderTransitionResult {
  if (!ORDER_TRANSITIONS[order.state].includes(to)) {
    return {
      ok: false,
      reason: "ILLEGAL_TRANSITION",
      detail: `Transición ilegal: ${order.state} → ${to}.`,
    };
  }
  const needsEvidence =
    to === "Paid observed" || to === "Payment authorized observed" || to === "Refund observed";
  if (needsEvidence && (!evidence || !evidence.reference.trim())) {
    return {
      ok: false,
      reason: "EVIDENCE_REQUIRED",
      detail: `«${to}» exige evidencia observada (referencia externa); no se marca sin ella.`,
    };
  }
  return {
    ok: true,
    order: {
      ...order,
      state: to,
      paymentEvidence:
        to === "Paid observed" || to === "Payment authorized observed"
          ? evidence
          : order.paymentEvidence,
      refundEvidence: to === "Refund observed" ? evidence : order.refundEvidence,
      history: [...order.history, { at: nowIso, from: order.state, to, actor, note }],
      updatedAt: nowIso,
    },
  };
}

/** Crea un pedido Draft desde el carrito validado + reserva convertible. */
export function createOrderDraft(
  input: {
    items: OrderItem[];
    reservationId?: string;
    paymentChoice: PaymentChoice;
    address?: PrimeBuildOfficialOrder["address"];
    shipping?: PrimeBuildOfficialOrder["shipping"];
  },
  nowIso: string,
  makeId: () => string,
): PrimeBuildOfficialOrder {
  return {
    id: makeId(),
    state: "Draft",
    items: input.items,
    reservationId: input.reservationId,
    paymentChoice: input.paymentChoice,
    address: input.address,
    shipping: input.shipping,
    history: [],
    createdAt: nowIso,
    updatedAt: nowIso,
    version: STOREFRONT_SCHEMA_VERSION,
  };
}

/* ─────────────────── Totales del pedido (PB + USD) ─────────────────── */

export interface OrderTotals {
  itemsCount: number;
  vaTotalUsd: string;
  vnTotalUsd: string;
  savingsUsd: string;
  pbTotalDisplay: string;
}

/** Suma los snapshots del pedido — nunca recalcula tasas por su cuenta. */
export function orderTotals(items: OrderItem[]): OrderTotals {
  let va = 0;
  let vn = 0;
  let pb = 0;
  let count = 0;
  for (const it of items) {
    const s = it.priceQuote.snapshot;
    va += parseFloat(s.vaUsd) * it.quantity;
    vn += parseFloat(s.vnUsd) * it.quantity;
    pb += parseFloat(s.pbDisplay) * it.quantity;
    count += it.quantity;
  }
  return {
    itemsCount: count,
    vaTotalUsd: va.toFixed(2),
    vnTotalUsd: vn.toFixed(2),
    savingsUsd: (va - vn).toFixed(2),
    pbTotalDisplay: pb.toFixed(2),
  };
}
