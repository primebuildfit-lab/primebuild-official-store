/**
 * Pure purchase-order logic (PBOS-001 · ORDEN 9). A real lifecycle whose states
 * cannot be skipped: creating a draft is not sending it, exporting is not
 * receipt, approving is not issuing, issuing is not confirming, confirming is not
 * receiving. Every transition is explicit and recorded. Nothing here sends a real
 * order.
 */

export type POStatus =
  | "borrador"
  | "en-revision"
  | "aprobada"
  | "preparada"
  | "emitida"
  | "confirmada"
  | "en-transito"
  | "parcialmente-recibida"
  | "con-discrepancias"
  | "recibida"
  | "cerrada"
  | "cancelada";

/** Allowed next states. States not listed here cannot be reached (no skipping). */
export const PO_TRANSITIONS: Record<POStatus, POStatus[]> = {
  borrador: ["en-revision", "cancelada"],
  "en-revision": ["aprobada", "borrador", "cancelada"],
  aprobada: ["preparada", "cancelada"],
  preparada: ["emitida", "cancelada"],
  emitida: ["confirmada", "cancelada"],
  confirmada: ["en-transito", "parcialmente-recibida", "cancelada"],
  "en-transito": ["parcialmente-recibida", "recibida", "con-discrepancias"],
  "parcialmente-recibida": ["recibida", "con-discrepancias"],
  "con-discrepancias": ["recibida", "cerrada"],
  recibida: ["cerrada"],
  cerrada: [],
  cancelada: [],
};

export const PO_STATUSES = Object.keys(PO_TRANSITIONS) as POStatus[];

export function canTransition(from: POStatus, to: POStatus): boolean {
  return PO_TRANSITIONS[from]?.includes(to) ?? false;
}

export interface POLine {
  id: string;
  sku: string;
  title?: string;
  qty: number;
  unit: string;
  unitPrice: number | null;
}

export interface POEvent {
  at: string;
  actor: string;
  from: POStatus | null;
  to: POStatus;
  reason: string;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  supplier: string;
  warehouse: string;
  currency: string;
  status: POStatus;
  lines: POLine[];
  additionalCosts: number;
  responsible?: string;
  approver?: string;
  expectedAt?: string | null;
  createdAt: string;
  history: POEvent[];
}

/** Order total from known line prices plus additional costs (single currency). */
export function orderSubtotal(lines: POLine[]): { subtotal: number; linesWithoutPrice: number } {
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

export function orderTotal(order: Pick<PurchaseOrder, "lines" | "additionalCosts">): number {
  return orderSubtotal(order.lines).subtotal + (order.additionalCosts || 0);
}

/** A PO can be deleted only while it is still a draft with no activity history. */
export function canDelete(order: Pick<PurchaseOrder, "status" | "history">): boolean {
  return order.status === "borrador" && order.history.length <= 1;
}

/** Currency may change only before any activity beyond creation. */
export function canChangeCurrency(order: Pick<PurchaseOrder, "status" | "history">): boolean {
  return order.status === "borrador" && order.history.length <= 1;
}

const STATUS_LABEL: Record<POStatus, string> = {
  borrador: "Borrador",
  "en-revision": "En revisión",
  aprobada: "Aprobada",
  preparada: "Preparada para enviar",
  emitida: "Emitida",
  confirmada: "Confirmada",
  "en-transito": "En tránsito",
  "parcialmente-recibida": "Parcialmente recibida",
  "con-discrepancias": "Con discrepancias",
  recibida: "Recibida",
  cerrada: "Cerrada",
  cancelada: "Cancelada",
};

export function statusLabel(s: POStatus): string {
  return STATUS_LABEL[s];
}
