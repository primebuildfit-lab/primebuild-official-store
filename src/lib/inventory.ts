/**
 * Inventory core (PBOS-001 · ORDEN 11). A small, local, append-only movement
 * ledger from which balances are DERIVED — there is no mutable balance kept
 * alongside it. It is a local workspace ledger, not CoinOS and not a second
 * financial platform. Damaged and quarantined stock are tracked separately and
 * never counted as available. The Available / Available-to-sell formula is not
 * defined yet, so it is shown as "Fórmula no definida" — never an arbitrary 0.
 */

import type { Receipt } from "./receiving";

export const INVENTORY_SCHEMA_VERSION = 1;

export type MovementType =
  | "recepcion"
  | "transferencia-salida"
  | "transferencia-entrada"
  | "ajuste-positivo"
  | "ajuste-negativo"
  | "devolucion"
  | "reversion";

export type StockCondition = "ok" | "dañado" | "cuarentena";
export type MovementDirection = "in" | "out";

export interface InventoryMovement {
  /** movementId (also the collection id). */
  id: string;
  movementType: MovementType;
  productId?: string;
  variantId?: string;
  sku?: string;
  warehouseId: string;
  locationId?: string;
  quantity: number;
  unit: string;
  condition: StockCondition;
  direction: MovementDirection;
  sourceType: string;
  sourceId?: string;
  correlationId?: string;
  actor: string;
  reason: string;
  occurredAt: string;
  recordedAt: string;
  status: "publicado";
  version: number;
  reversalOf?: string;
}

/** Runtime validator for safe reads (used by the versioned local store). */
export function isMovement(x: unknown): x is InventoryMovement {
  if (x === null || typeof x !== "object") return false;
  const m = x as Record<string, unknown>;
  return (
    typeof m.id === "string" &&
    typeof m.movementType === "string" &&
    typeof m.warehouseId === "string" &&
    typeof m.quantity === "number" &&
    (m.direction === "in" || m.direction === "out") &&
    (m.condition === "ok" || m.condition === "dañado" || m.condition === "cuarentena") &&
    m.status === "publicado"
  );
}

/** Signed quantity: +in, -out. Quantities are treated as exact counts. */
export function signedQuantity(m: Pick<InventoryMovement, "quantity" | "direction">): number {
  return m.direction === "in" ? m.quantity : -m.quantity;
}

/** A canonical key for a stock line (SKU preferred, else product id). */
export function stockKey(m: Pick<InventoryMovement, "sku" | "productId">): string {
  return m.sku && m.sku.trim() ? m.sku.trim() : (m.productId ?? "—");
}

export interface Balance {
  key: string;
  sku?: string;
  productId?: string;
  warehouseId: string;
  /** Net physically present (all conditions). */
  physical: number;
  /** Sound on-hand (condition "ok"). */
  onHand: number;
  damaged: number;
  quarantine: number;
  lastActivityAt: string | null;
}

/**
 * Derive per-(key, warehouse) balances from published movements. Only keys that
 * actually have movements appear — the catalog is never turned into inventory.
 * `available` is deliberately not computed here (formula undefined).
 */
export function deriveBalances(movements: InventoryMovement[]): Balance[] {
  const map = new Map<string, Balance>();
  for (const m of movements) {
    if (m.status !== "publicado") continue;
    const key = stockKey(m);
    const id = `${key}|||${m.warehouseId}`;
    const b =
      map.get(id) ??
      ({
        key,
        sku: m.sku,
        productId: m.productId,
        warehouseId: m.warehouseId,
        physical: 0,
        onHand: 0,
        damaged: 0,
        quarantine: 0,
        lastActivityAt: null,
      } satisfies Balance);
    const q = signedQuantity(m);
    b.physical += q;
    if (m.condition === "ok") b.onHand += q;
    else if (m.condition === "dañado") b.damaged += q;
    else if (m.condition === "cuarentena") b.quarantine += q;
    if (!b.lastActivityAt || m.occurredAt > b.lastActivityAt) b.lastActivityAt = m.occurredAt;
    map.set(id, b);
  }
  return [...map.values()];
}

/** Balance for one key+warehouse, or null if there are no movements for it. */
export function balanceFor(
  movements: InventoryMovement[],
  key: string,
  warehouseId: string,
): Balance | null {
  return (
    deriveBalances(movements).find((b) => b.key === key && b.warehouseId === warehouseId) ?? null
  );
}

/** True if a receipt has already been posted to the ledger (idempotency guard). */
export function isReceiptPosted(movements: InventoryMovement[], receiptId: string): boolean {
  return movements.some((m) => m.sourceType === "recepcion" && m.correlationId === receiptId);
}

/** Map a receipt condition to a stock condition; "incorrecto" is not posted. */
function conditionOf(c: string): StockCondition | null {
  if (c === "ok") return "ok";
  if (c === "dañado") return "dañado";
  if (c === "cuarentena") return "cuarentena";
  return null; // "incorrecto" is never posted to stock
}

/**
 * Build the append-only movements that post a CLOSED receipt to the ledger.
 * Idempotent by the receipt id (caller must check isReceiptPosted first, or pass
 * `existing`). Damaged → Damaged, Quarantine → Quarantine; wrong product is not
 * posted. Never touches Shopify or remote inventory.
 */
export function postReceiptMovements(
  receipt: Receipt,
  actor: string,
  existing: InventoryMovement[] = [],
  now: string = new Date().toISOString(),
  makeId: () => string = () => `mov_${Math.random().toString(36).slice(2)}`,
): InventoryMovement[] {
  if (receipt.status !== "completada" && receipt.status !== "con-discrepancias") return [];
  if (isReceiptPosted(existing, receipt.id)) return [];
  const out: InventoryMovement[] = [];
  for (const line of receipt.lines) {
    const condition = conditionOf(line.condition);
    if (!condition) continue;
    if (!Number.isFinite(line.received) || line.received <= 0) continue;
    out.push({
      id: makeId(),
      movementType: "recepcion",
      sku: line.sku || undefined,
      warehouseId: receipt.warehouse || "sin-almacen",
      locationId: line.location || undefined,
      quantity: line.received,
      unit: "unidad",
      condition,
      direction: "in",
      sourceType: "recepcion",
      sourceId: receipt.id,
      correlationId: receipt.id,
      actor,
      reason: `Contabilización de recepción ${receipt.poNumber}`,
      occurredAt: receipt.closedAt ?? now,
      recordedAt: now,
      status: "publicado",
      version: INVENTORY_SCHEMA_VERSION,
    });
  }
  return out;
}

/** Build the compensating movement that reverses a published movement. */
export function reverseMovement(
  m: InventoryMovement,
  actor: string,
  reason: string,
  now: string = new Date().toISOString(),
  makeId: () => string = () => `mov_${Math.random().toString(36).slice(2)}`,
): InventoryMovement {
  return {
    ...m,
    id: makeId(),
    movementType: "reversion",
    direction: m.direction === "in" ? "out" : "in",
    sourceType: "reversion",
    sourceId: m.id,
    correlationId: m.correlationId,
    actor,
    reason,
    occurredAt: now,
    recordedAt: now,
    reversalOf: m.id,
  };
}

export const CONDITION_LABEL: Record<StockCondition, string> = {
  ok: "Disponible físico",
  dañado: "Dañado",
  cuarentena: "Cuarentena",
};
