/**
 * Pure transfer logic (PBOS-001 · ORDEN 13). Dispatch and receipt produce
 * DIFFERENT movements: dispatched stock leaves the origin and is In-transit until
 * received at the destination — it is never available in both at once. Partial
 * receipts keep a pending quantity, movements are idempotent (a retry cannot
 * double-count), and a transfer with activity cannot be deleted. Nothing here
 * touches Shopify or remote inventory.
 */

import { INVENTORY_SCHEMA_VERSION, type InventoryMovement, type StockCondition } from "./inventory";

export const TRANSFER_SCHEMA_VERSION = 1;

export type TransferStatus =
  | "borrador"
  | "pendiente"
  | "preparando"
  | "en-transito"
  | "parcial"
  | "con-discrepancias"
  | "recibida"
  | "cancelada";

export const TRANSFER_TRANSITIONS: Record<TransferStatus, TransferStatus[]> = {
  borrador: ["pendiente", "cancelada"],
  pendiente: ["preparando", "cancelada"],
  preparando: ["en-transito", "cancelada"],
  "en-transito": ["parcial", "recibida", "con-discrepancias"],
  parcial: ["recibida", "con-discrepancias"],
  "con-discrepancias": ["recibida"],
  recibida: [],
  cancelada: [],
};

export function canTransferTransition(from: TransferStatus, to: TransferStatus): boolean {
  return TRANSFER_TRANSITIONS[from]?.includes(to) ?? false;
}

export interface TransferLine {
  id: string;
  sku: string;
  qty: number;
  unit: string;
  received: number;
}

export interface TransferEvent {
  at: string;
  actor: string;
  from: TransferStatus | null;
  to: TransferStatus;
  reason: string;
}

export interface Transfer {
  id: string;
  code: string;
  originCode: string;
  destCode: string;
  status: TransferStatus;
  lines: TransferLine[];
  responsible?: string;
  expectedAt?: string | null;
  dispatchedAt?: string | null;
  receivedAt?: string | null;
  history: TransferEvent[];
  version: number;
}

export function isTransfer(x: unknown): x is Transfer {
  if (x === null || typeof x !== "object") return false;
  const t = x as Record<string, unknown>;
  return (
    typeof t.id === "string" &&
    typeof t.originCode === "string" &&
    typeof t.destCode === "string" &&
    Array.isArray(t.lines)
  );
}

export function validateTransfer(input: {
  originCode: string;
  destCode: string;
  lines: TransferLine[];
}): { ok: boolean; error?: string } {
  if (!input.originCode.trim() || !input.destCode.trim())
    return { ok: false, error: "Origen y destino son obligatorios." };
  if (input.originCode.trim() === input.destCode.trim())
    return { ok: false, error: "Origen y destino no pueden ser iguales." };
  if (input.lines.length === 0) return { ok: false, error: "Añade al menos una línea." };
  return { ok: true };
}

/** Whether the origin has enough sound (ok) stock for a line. */
export function withinAvailable(availableOk: number, qty: number): boolean {
  return qty <= availableOk;
}

const cond: StockCondition = "ok";

/** Dispatch movements: stock leaves the origin (out). Idempotent by correlationId. */
export function buildDispatchMovements(
  transfer: Transfer,
  actor: string,
  existing: InventoryMovement[] = [],
  now: string = new Date().toISOString(),
  makeId: () => string = () => `mov_${Math.random().toString(36).slice(2)}`,
): InventoryMovement[] {
  const correlationId = `${transfer.id}:out`;
  if (existing.some((m) => m.correlationId === correlationId)) return [];
  return transfer.lines
    .filter((l) => l.qty > 0)
    .map((l) => ({
      id: makeId(),
      movementType: "transferencia-salida" as const,
      sku: l.sku || undefined,
      warehouseId: transfer.originCode,
      quantity: l.qty,
      unit: l.unit || "unidad",
      condition: cond,
      direction: "out" as const,
      sourceType: "transferencia",
      sourceId: transfer.id,
      correlationId,
      actor,
      reason: `Despacho de transferencia ${transfer.code}`,
      occurredAt: now,
      recordedAt: now,
      status: "publicado" as const,
      version: INVENTORY_SCHEMA_VERSION,
    }));
}

/**
 * Receive movements: received quantities arrive at the destination (in). Each
 * receive event is idempotent by its own correlationId; only the newly-received
 * delta per line is posted.
 */
export function buildReceiveMovements(
  transfer: Transfer,
  receivedNow: Record<string, number>,
  actor: string,
  eventId: string,
  now: string = new Date().toISOString(),
  makeId: () => string = () => `mov_${Math.random().toString(36).slice(2)}`,
): InventoryMovement[] {
  const correlationId = `${transfer.id}:in:${eventId}`;
  return transfer.lines
    .map((l) => ({ line: l, delta: receivedNow[l.id] ?? 0 }))
    .filter(({ delta }) => delta > 0)
    .map(({ line, delta }) => ({
      id: makeId(),
      movementType: "transferencia-entrada" as const,
      sku: line.sku || undefined,
      warehouseId: transfer.destCode,
      quantity: delta,
      unit: line.unit || "unidad",
      condition: cond,
      direction: "in" as const,
      sourceType: "transferencia",
      sourceId: transfer.id,
      correlationId,
      actor,
      reason: `Recepción de transferencia ${transfer.code}`,
      occurredAt: now,
      recordedAt: now,
      status: "publicado" as const,
      version: INVENTORY_SCHEMA_VERSION,
    }));
}

const STATUS_LABEL: Record<TransferStatus, string> = {
  borrador: "Borrador",
  pendiente: "Pendiente",
  preparando: "Preparando",
  "en-transito": "En tránsito",
  parcial: "Parcial",
  "con-discrepancias": "Con discrepancias",
  recibida: "Recibida",
  cancelada: "Cancelada",
};

export function transferStatusLabel(s: TransferStatus): string {
  return STATUS_LABEL[s];
}
