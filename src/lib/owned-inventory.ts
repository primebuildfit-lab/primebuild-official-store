/**
 * PrimeBuildOwnedInventory — inventario físico autoritativo de la Official
 * Store (PBOS-DPB-MEGA-FABLE-001 §8, §10-§14, §47, §66).
 *
 * NO es una verdad paralela: se DERIVA del ledger append-only existente
 * (src/lib/inventory.ts) más la colección de reservas. La orden define por fin
 * la fórmula de disponibilidad:
 *
 *     available = onHand − reserved − damaged
 *
 * Mapeo al ledger (documentado, sin doble conteo):
 *  - onHand   := physical (todas las unidades físicamente presentes)
 *  - damaged  := dañado + cuarentena (no vendible; cuarentena se agrupa con
 *                dañado para la fórmula y se muestra aparte)
 *  - reserved := suma de reservas activas no vencidas
 *  ⇒ available = ok − reserved  (lo vendible menos lo comprometido)
 *
 * Reglas duras: el stock del proveedor dropshipping JAMÁS entra aquí sin una
 * recepción explícita; nada de stock negativo; reservas idempotentes con
 * caducidad; visibilidad pública solo con available > 0 + elegibilidad +
 * clasificación OWNED_STOCK.
 */

import { deriveBalances, type Balance, type InventoryMovement } from "./inventory";

export const OWNED_INVENTORY_SCHEMA_VERSION = 1;

/* ─────────────────────────── Contrato §8 ─────────────────────────── */

export type InventoryClassification = "OWNED_STOCK" | "SUPPLIER_STOCK_OBSERVED";

export type OwnedInventoryStatus =
  | "in_stock"
  | "low_stock"
  | "out_of_stock";

export interface OwnedInventoryItem {
  inventoryItemId: string;
  productId?: string;
  variantId?: string;
  sku?: string;
  warehouseId: string;
  locationId?: string;
  onHand: number;
  reserved: number;
  available: number;
  damaged: number;
  /** Cuarentena, mostrada aparte; incluida en el término damaged de la fórmula. */
  quarantine: number;
  incoming: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  lastCountedAt?: string;
  lastMovementAt: string | null;
  /** Fuente de la derivación (siempre el ledger local + reservas). */
  source: "ledger_local";
  status: OwnedInventoryStatus;
}

/** available = onHand − reserved − damaged (§8). */
export function computeAvailable(input: {
  onHand: number;
  reserved: number;
  damaged: number;
}): number {
  return input.onHand - input.reserved - input.damaged;
}

/* ─────────────────────────── Reservas §47 ─────────────────────────── */

export type ReservationStatus =
  | "Active"
  | "Extended"
  | "Converted"
  | "Expired"
  | "Released"
  | "Failed";

export interface ReservationLine {
  productId?: string;
  variantId?: string;
  sku?: string;
  warehouseId: string;
  quantity: number;
}

export interface InventoryReservation {
  /** reservationId (también id de la colección local). */
  id: string;
  /** Idempotencia: una misma clave nunca crea dos reservas. */
  idempotencyKey: string;
  items: ReservationLine[];
  status: ReservationStatus;
  createdAt: string;
  expiresAt: string;
  sourceType: "checkout" | "manual";
  sourceId?: string;
  actor: string;
  version: number;
}

function lineKey(l: Pick<ReservationLine, "sku" | "productId">): string {
  return l.sku && l.sku.trim() ? l.sku.trim() : (l.productId ?? "—");
}

/** Reserva viva a un instante dado: Active/Extended y no vencida. */
export function isReservationLive(r: InventoryReservation, nowIso: string): boolean {
  if (r.status !== "Active" && r.status !== "Extended") return false;
  return Date.parse(r.expiresAt) > Date.parse(nowIso);
}

/** Unidades reservadas vivas para una línea de stock en un almacén. */
export function reservedQuantity(
  reservations: InventoryReservation[],
  key: string,
  warehouseId: string,
  nowIso: string,
): number {
  let total = 0;
  for (const r of reservations) {
    if (!isReservationLive(r, nowIso)) continue;
    for (const l of r.items) {
      if (lineKey(l) === key && l.warehouseId === warehouseId) total += l.quantity;
    }
  }
  return total;
}

export type ReservationResult =
  | { ok: true; reservation: InventoryReservation; idempotentReplay: boolean }
  | { ok: false; reason: "OVERSELL_PREVENTED" | "INVALID_QUANTITY" | "NO_STOCK_LINE"; detail: string };

/**
 * Crea una reserva de forma atómica sobre el estado derivado: valida CADA
 * línea contra available (ledger − reservas vivas) y rechaza el conjunto
 * completo si alguna excede el disponible (§12, §45). Idempotente por
 * idempotencyKey: si ya existe, devuelve la existente sin duplicar (§66).
 */
export function createReservation(
  input: {
    idempotencyKey: string;
    items: ReservationLine[];
    expiresAt: string;
    sourceType: "checkout" | "manual";
    sourceId?: string;
    actor: string;
  },
  state: {
    movements: InventoryMovement[];
    reservations: InventoryReservation[];
    nowIso: string;
    makeId: () => string;
  },
): ReservationResult {
  const existing = state.reservations.find((r) => r.idempotencyKey === input.idempotencyKey);
  if (existing) return { ok: true, reservation: existing, idempotentReplay: true };

  if (input.items.length === 0) {
    return { ok: false, reason: "INVALID_QUANTITY", detail: "La reserva no tiene líneas." };
  }
  for (const l of input.items) {
    if (!Number.isInteger(l.quantity) || l.quantity <= 0) {
      return {
        ok: false,
        reason: "INVALID_QUANTITY",
        detail: `Cantidad inválida (${l.quantity}) para ${lineKey(l)}.`,
      };
    }
  }

  const balances = deriveBalances(state.movements);
  for (const l of input.items) {
    const key = lineKey(l);
    const b = balances.find((x) => x.key === key && x.warehouseId === l.warehouseId);
    if (!b) {
      return {
        ok: false,
        reason: "NO_STOCK_LINE",
        detail: `No existe línea de stock para ${key} en ${l.warehouseId}.`,
      };
    }
    const alreadyReserved = reservedQuantity(state.reservations, key, l.warehouseId, state.nowIso);
    const available = b.onHand - alreadyReserved;
    if (l.quantity > available) {
      return {
        ok: false,
        reason: "OVERSELL_PREVENTED",
        detail: `Sobreventa evitada: ${key} en ${l.warehouseId} tiene ${available} disponible y se pidieron ${l.quantity}.`,
      };
    }
  }

  const reservation: InventoryReservation = {
    id: state.makeId(),
    idempotencyKey: input.idempotencyKey,
    items: input.items,
    status: "Active",
    createdAt: state.nowIso,
    expiresAt: input.expiresAt,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    actor: input.actor,
    version: OWNED_INVENTORY_SCHEMA_VERSION,
  };
  return { ok: true, reservation, idempotentReplay: false };
}

const RESERVATION_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  Active: ["Extended", "Converted", "Expired", "Released", "Failed"],
  Extended: ["Converted", "Expired", "Released", "Failed"],
  Converted: [],
  Expired: ["Released"],
  Released: [],
  Failed: [],
};

/** Transición legal de una reserva; devuelve null si el salto está prohibido. */
export function transitionReservation(
  r: InventoryReservation,
  to: ReservationStatus,
  nowIso: string,
  newExpiresAt?: string,
): InventoryReservation | null {
  if (!RESERVATION_TRANSITIONS[r.status].includes(to)) return null;
  if (to === "Converted" && !isReservationLive(r, nowIso)) return null; // no convertir vencidas
  return {
    ...r,
    status: to,
    expiresAt: to === "Extended" && newExpiresAt ? newExpiresAt : r.expiresAt,
  };
}

/** Marca como Expired toda reserva viva cuyo plazo pasó (pura; devuelve copia). */
export function expireReservations(
  reservations: InventoryReservation[],
  nowIso: string,
): { updated: InventoryReservation[]; expiredIds: string[] } {
  const expiredIds: string[] = [];
  const updated = reservations.map((r) => {
    if ((r.status === "Active" || r.status === "Extended") && Date.parse(r.expiresAt) <= Date.parse(nowIso)) {
      expiredIds.push(r.id);
      return { ...r, status: "Expired" as ReservationStatus };
    }
    return r;
  });
  return { updated, expiredIds };
}

/* ──────────────────── Derivación del contrato §8 ──────────────────── */

export interface OwnedInventoryConfig {
  /** Punto/cantidad de reorden por clave de stock (opcional, de reposición). */
  reorder?: Record<string, { reorderPoint?: number; reorderQuantity?: number }>;
  /** Unidades entrantes observadas por clave|almacén (transferencias/OC abiertas). */
  incoming?: Record<string, number>;
  /** Último conteo por clave|almacén (ISO). */
  lastCountedAt?: Record<string, string>;
}

function statusOf(available: number, reorderPoint?: number): OwnedInventoryStatus {
  if (available <= 0) return "out_of_stock";
  if (reorderPoint !== undefined && available <= reorderPoint) return "low_stock";
  return "in_stock";
}

/**
 * Deriva el inventario propio (contrato §8) desde el ledger + reservas. Cada
 * línea lleva fuente y timestamp del último movimiento — nada finge «en vivo»
 * sin fuente (§11).
 */
export function deriveOwnedInventory(
  movements: InventoryMovement[],
  reservations: InventoryReservation[],
  nowIso: string,
  config: OwnedInventoryConfig = {},
): OwnedInventoryItem[] {
  return deriveBalances(movements).map((b: Balance) => {
    const reserved = reservedQuantity(reservations, b.key, b.warehouseId, nowIso);
    const damagedTerm = b.damaged + b.quarantine;
    const available = computeAvailable({ onHand: b.physical, reserved, damaged: damagedTerm });
    const slot = `${b.key}|||${b.warehouseId}`;
    const reorder = config.reorder?.[b.key] ?? {};
    return {
      inventoryItemId: slot,
      productId: b.productId,
      sku: b.sku,
      warehouseId: b.warehouseId,
      onHand: b.physical,
      reserved,
      available,
      damaged: b.damaged,
      quarantine: b.quarantine,
      incoming: config.incoming?.[slot] ?? 0,
      reorderPoint: reorder.reorderPoint,
      reorderQuantity: reorder.reorderQuantity,
      lastCountedAt: config.lastCountedAt?.[slot],
      lastMovementAt: b.lastActivityAt,
      source: "ledger_local",
      status: statusOf(available, reorder.reorderPoint),
    } satisfies OwnedInventoryItem;
  });
}

/** Disponible agregado (todas las bodegas) para una clave de stock. */
export function availableForKey(items: OwnedInventoryItem[], key: string): number {
  return items
    .filter((i) => i.inventoryItemId.startsWith(`${key}|||`))
    .reduce((acc, i) => acc + Math.max(0, i.available), 0);
}

/* ─────────────────── Visibilidad pública §10 ─────────────────── */

export type PublicationState =
  | "visible"
  | "hidden_out_of_stock"
  | "hidden_not_eligible"
  | "hidden_not_owned_stock";

/**
 * Regla obligatoria de publicación: solo visible con available > 0 Y
 * officialStoreEligible Y clasificación OWNED_STOCK. En Admin/Internal OS el
 * producto oculto sigue apareciendo como «Out of stock / Hidden».
 */
export function publicationState(input: {
  available: number;
  officialStoreEligible: boolean;
  inventoryClassification: InventoryClassification;
}): PublicationState {
  if (input.inventoryClassification !== "OWNED_STOCK") return "hidden_not_owned_stock";
  if (!input.officialStoreEligible) return "hidden_not_eligible";
  if (input.available <= 0) return "hidden_out_of_stock";
  return "visible";
}

/* ─────────────────── Etiquetas de stock en vivo §11 ─────────────────── */

export interface StockBadges {
  primary: "in_stock" | "low_stock" | "out_of_stock";
  reserved: boolean;
  incoming: boolean;
  /** Fuente + instante: sin ellos no se afirma «en vivo». */
  source: "ledger_local";
  asOf: string | null;
}

export function stockBadges(item: OwnedInventoryItem): StockBadges {
  return {
    primary: item.status,
    reserved: item.reserved > 0,
    incoming: item.incoming > 0,
    source: item.source,
    asOf: item.lastMovementAt,
  };
}

/* ─────────────────── Prevención de stock negativo §66 ─────────────────── */

/**
 * ¿Un movimiento de salida dejaría el saldo físico u ok en negativo?
 * Se usa como guard ANTES de aceptar el movimiento; el ledger sigue siendo
 * append-only (nunca se borra un movimiento para «arreglar» un saldo).
 */
export function wouldGoNegative(
  movements: InventoryMovement[],
  candidate: Pick<InventoryMovement, "sku" | "productId" | "warehouseId" | "quantity" | "direction" | "condition">,
): boolean {
  if (candidate.direction === "in") return false;
  const key = candidate.sku && candidate.sku.trim() ? candidate.sku.trim() : (candidate.productId ?? "—");
  const b = deriveBalances(movements).find(
    (x) => x.key === key && x.warehouseId === candidate.warehouseId,
  );
  if (!b) return true; // sin línea de stock, toda salida es negativa
  if (b.physical - candidate.quantity < 0) return true;
  if (candidate.condition === "ok" && b.onHand - candidate.quantity < 0) return true;
  if (candidate.condition === "dañado" && b.damaged - candidate.quantity < 0) return true;
  if (candidate.condition === "cuarentena" && b.quarantine - candidate.quantity < 0) return true;
  return false;
}

/* ─────────────────── Envío rápido veraz §14 ─────────────────── */

export interface FastShippingInput {
  stockConfirmed: boolean; // stock físico disponible confirmado
  warehouseAssigned: boolean;
  carrierServiceAvailable: boolean;
  cutoffDefined: boolean;
  destinationEligible: boolean;
  slaRegistered: boolean;
}

export interface FastShippingVerdict {
  eligible: boolean;
  missing: string[];
}

const FAST_SHIPPING_LABELS: Record<keyof FastShippingInput, string> = {
  stockConfirmed: "Stock físico confirmado",
  warehouseAssigned: "Almacén asignado",
  carrierServiceAvailable: "Transportista/servicio disponible",
  cutoffDefined: "Hora de corte definida",
  destinationEligible: "Destino elegible",
  slaRegistered: "SLA registrado",
};

/**
 * La promesa de envío rápido SOLO se muestra si todas las condiciones son
 * verdaderas. La disponibilidad del proveedor dropshipping nunca cuenta.
 */
export function fastShippingVerdict(input: FastShippingInput): FastShippingVerdict {
  const missing = (Object.keys(FAST_SHIPPING_LABELS) as (keyof FastShippingInput)[])
    .filter((k) => !input[k])
    .map((k) => FAST_SHIPPING_LABELS[k]);
  return { eligible: missing.length === 0, missing };
}
