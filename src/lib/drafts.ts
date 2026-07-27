/**
 * Pure drafts & quotes logic (PBOS-DRAFTS-CORRECTIVE-001). Local sales drafts and
 * quotes built from real catalog/customer/price data. Prices are observed or
 * configured — an unknown price is never 0; currencies are never mixed; taxes only
 * appear with a source. Converting creates a LOCAL operational order projection
 * with traceability — never a Shopify order, never a reservation, never an email.
 */

import type { SalesOrderProjection } from "./orders";

export const DRAFTS_SCHEMA_VERSION = 1;

export type DraftKind = "borrador" | "cotizacion";
export type DraftStatus =
  "abierto" | "pendiente-revision" | "convertido" | "expirado" | "cancelado" | "archivado";

export interface DraftLine {
  id: string;
  sku: string;
  title?: string;
  qty: number;
  unit: string;
  unitPrice: number | null;
}

export interface SalesDraft {
  id: string;
  kind: DraftKind;
  customerRef: string | null;
  lines: DraftLine[];
  currency: string | null;
  /** Only when explicitly configured. */
  discount: number | null;
  status: DraftStatus;
  validUntil: string | null;
  responsible: string | null;
  actor: string;
  reason: string | null;
  source: "local";
  version: number;
  history: { at: string; actor: string; action: string }[];
  createdAt: string;
  updatedAt: string;
}

export function isSalesDraft(x: unknown): x is SalesDraft {
  if (x === null || typeof x !== "object") return false;
  const d = x as Record<string, unknown>;
  return typeof d.id === "string" && Array.isArray(d.lines) && typeof d.kind === "string";
}

/** Subtotal over lines with a known unit price; the rest are counted, not zeroed. */
export function draftSubtotal(lines: DraftLine[]): { subtotal: number; linesWithoutPrice: number } {
  let subtotal = 0;
  let linesWithoutPrice = 0;
  for (const l of lines) {
    if (l.unitPrice == null || !Number.isFinite(l.unitPrice) || l.qty <= 0) {
      linesWithoutPrice += 1;
      continue;
    }
    subtotal += l.unitPrice * l.qty;
  }
  return { subtotal, linesWithoutPrice };
}

/** Total = subtotal − discount (only if configured). Taxes require a source (none). */
export function draftTotal(draft: Pick<SalesDraft, "lines" | "discount">): {
  total: number;
  linesWithoutPrice: number;
} {
  const { subtotal, linesWithoutPrice } = draftSubtotal(draft.lines);
  const discount = draft.discount != null && Number.isFinite(draft.discount) ? draft.discount : 0;
  return { total: subtotal - discount, linesWithoutPrice };
}

export function isExpired(draft: SalesDraft, now: Date = new Date()): boolean {
  if (draft.status === "convertido" || draft.status === "cancelado") return false;
  if (!draft.validUntil) return false;
  return new Date(draft.validUntil).getTime() < now.getTime();
}

/** Effective status folding expiry in (does not mutate the record). */
export function effectiveStatus(draft: SalesDraft, now: Date = new Date()): DraftStatus {
  if (isExpired(draft, now) && draft.status === "abierto") return "expirado";
  return draft.status;
}

export function validateDraft(input: { currency: string | null; lines: DraftLine[] }): {
  ok: boolean;
  error?: string;
} {
  if (!input.currency) return { ok: false, error: "Define una moneda para el borrador." };
  if (!/^[A-Z]{3}$/.test(input.currency)) return { ok: false, error: "Moneda ISO de 3 letras." };
  return { ok: true };
}

/**
 * Convert a draft into a LOCAL operational order projection (source "manual").
 * Idempotent by draft id; keeps traceability; never a Shopify order or reservation.
 */
export function draftToOrderProjection(
  draft: SalesDraft,
  now: string = new Date().toISOString(),
  makeId: () => string = () => `ord_${Math.random().toString(36).slice(2)}`,
): SalesOrderProjection {
  const { total } = draftTotal(draft);
  return {
    id: makeId(),
    source: "manual",
    externalId: `draft:${draft.id}`,
    idempotencyKey: `draft:${draft.id}`,
    correlationId: `draft:${draft.id}`,
    name: `${draft.kind === "cotizacion" ? "Cotización" : "Borrador"} ${draft.id.slice(0, 6)}`,
    observedAt: now,
    currency: draft.currency ?? "—",
    totalObserved: draft.currency ? String(total) : "No medido",
    customerMasked: draft.customerRef,
    orderStatus: "nuevo",
    paymentObserved: "no-observado",
    reservationStatus: "sin-reservar",
    fulfillmentObserved: "UNFULFILLED",
    returnStatus: "ninguna",
    syncStatus: "observado",
    notes: [{ at: now, text: `Convertido desde ${draft.kind} local ${draft.id}` }],
    history: [{ at: now, actor: draft.actor, action: `Creado desde ${draft.kind} ${draft.id}` }],
    lastVerifiedAt: now,
  };
}
