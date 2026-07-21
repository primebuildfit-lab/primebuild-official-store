/**
 * Pure returns logic (PBOS-001 · ORDEN 21). Five planes are kept strictly
 * separate: physical return, inspection, inventory destination, financial
 * decision, and observed refund. Goods are never reintegrated to available before
 * inspection. A destination that produces inventory posts an append-only ledger
 * movement (idempotent, with correlation/actor/reason) — never edits a balance,
 * never touches Shopify. Refund is observed only; a local note never marks it
 * completed.
 */

import { INVENTORY_SCHEMA_VERSION, type InventoryMovement, type StockCondition } from "./inventory";

export const RETURNS_SCHEMA_VERSION = 1;

export type ReturnStatus =
  | "solicitada"
  | "pendiente-autorizacion"
  | "autorizada"
  | "en-transito"
  | "recibida"
  | "pendiente-inspeccion"
  | "en-revision"
  | "pendiente-reembolso"
  | "cerrada"
  | "rechazada";

export const RETURN_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  solicitada: ["pendiente-autorizacion", "rechazada"],
  "pendiente-autorizacion": ["autorizada", "rechazada"],
  autorizada: ["en-transito", "rechazada"],
  "en-transito": ["recibida"],
  recibida: ["pendiente-inspeccion"],
  "pendiente-inspeccion": ["en-revision"],
  "en-revision": ["pendiente-reembolso", "cerrada"],
  "pendiente-reembolso": ["cerrada"],
  cerrada: [],
  rechazada: [],
};

export function canReturnTransition(from: ReturnStatus, to: ReturnStatus): boolean {
  return RETURN_TRANSITIONS[from]?.includes(to) ?? false;
}

export type ReturnDestination =
  | "reintegrar-disponible"
  | "reintegrar-no-disponible"
  | "cuarentena"
  | "dañado"
  | "reparacion"
  | "devolver-proveedor"
  | "desechar";

export const RETURN_DESTINATIONS: ReturnDestination[] = [
  "reintegrar-disponible",
  "reintegrar-no-disponible",
  "cuarentena",
  "dañado",
  "reparacion",
  "devolver-proveedor",
  "desechar",
];

export interface ReturnLine {
  id: string;
  sku: string;
  qty: number;
  unit: string;
  inspected: boolean;
  destination?: ReturnDestination;
}

export interface RefundObserved {
  requested?: string;
  authorized?: string;
  currency?: string;
  provider?: string;
  status?: string;
  reference?: string;
  error?: string;
}

export interface SalesReturn {
  id: string;
  code: string;
  orderId: string;
  orderExternalId: string;
  source: "shopify" | "manual";
  reason: string;
  lines: ReturnLine[];
  status: ReturnStatus;
  refund: RefundObserved;
  warehouse?: string;
  actor: string;
  createdAt: string;
  history: {
    at: string;
    actor: string;
    from: ReturnStatus | null;
    to: ReturnStatus;
    reason: string;
  }[];
  posted: boolean;
  version: number;
}

export function isReturn(x: unknown): x is SalesReturn {
  if (x === null || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  return typeof r.id === "string" && typeof r.orderId === "string" && Array.isArray(r.lines);
}

/** Inspection is required before any reintegration to stock. */
export function inspectionComplete(ret: SalesReturn): boolean {
  return ret.lines.length > 0 && ret.lines.every((l) => l.inspected);
}

/** The stock condition a destination posts to, or null if it produces no stock. */
export function destinationCondition(dest: ReturnDestination | undefined): StockCondition | null {
  switch (dest) {
    case "reintegrar-disponible":
      return "ok";
    case "cuarentena":
    case "reintegrar-no-disponible":
      return "cuarentena";
    case "dañado":
      return "dañado";
    default:
      return null; // reparacion / devolver-proveedor / desechar → no stock
  }
}

/**
 * Build the append-only return movements — only for inspected lines whose
 * destination produces stock, and only when inspection is complete. Idempotent by
 * correlationId; damaged/quarantine never become available.
 */
export function buildReturnMovements(
  ret: SalesReturn,
  actor: string,
  existing: InventoryMovement[] = [],
  now: string = new Date().toISOString(),
  makeId: () => string = () => `mov_${Math.random().toString(36).slice(2)}`,
): InventoryMovement[] {
  if (!inspectionComplete(ret)) return [];
  const correlationId = `${ret.id}:return`;
  if (existing.some((m) => m.correlationId === correlationId)) return [];
  return ret.lines
    .map((l) => ({ line: l, condition: destinationCondition(l.destination) }))
    .filter((x): x is { line: ReturnLine; condition: StockCondition } => x.condition !== null)
    .filter(({ line }) => line.qty > 0)
    .map(({ line, condition }) => ({
      id: makeId(),
      movementType: "devolucion" as const,
      sku: line.sku || undefined,
      warehouseId: ret.warehouse || "sin-almacen",
      quantity: line.qty,
      unit: line.unit || "unidad",
      condition,
      direction: "in" as const,
      sourceType: "devolucion",
      sourceId: ret.id,
      correlationId,
      actor,
      reason: `Reintegro por devolución ${ret.code}`,
      occurredAt: now,
      recordedAt: now,
      status: "publicado" as const,
      version: INVENTORY_SCHEMA_VERSION,
    }));
}

const STATUS_LABEL: Record<ReturnStatus, string> = {
  solicitada: "Solicitada",
  "pendiente-autorizacion": "Pendiente de autorización",
  autorizada: "Autorizada",
  "en-transito": "En tránsito",
  recibida: "Recibida",
  "pendiente-inspeccion": "Pendiente de inspección",
  "en-revision": "En revisión",
  "pendiente-reembolso": "Pendiente de reembolso",
  cerrada: "Cerrada",
  rechazada: "Rechazada",
};

export function returnStatusLabel(s: ReturnStatus): string {
  return STATUS_LABEL[s];
}
