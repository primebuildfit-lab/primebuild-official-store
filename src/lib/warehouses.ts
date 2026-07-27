/**
 * Pure warehouse logic (PBOS-001 · ORDEN 12). Warehouses and locations are only
 * what the operator creates — no fictional main warehouse is seeded. Location
 * codes are unique within a warehouse, the hierarchy cannot cycle, and quarantine
 * / damaged locations are never sellable. A virtual location is flagged as not
 * physical.
 */

export const WAREHOUSE_SCHEMA_VERSION = 1;

export type WarehouseStatus = "activo" | "inactivo" | "archivado";

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  status: WarehouseStatus;
  timezone?: string;
  responsible?: string;
  address?: string;
  /** Shopify location id, only when there is real evidence of a mapping. */
  shopifyLocationId?: string | null;
  createdAt: string;
}

export type LocationType =
  | "recepcion"
  | "almacenamiento"
  | "picking"
  | "packing"
  | "staging"
  | "cuarentena"
  | "dañados"
  | "devoluciones"
  | "despacho"
  | "overflow"
  | "virtual";

export const LOCATION_TYPES: LocationType[] = [
  "recepcion",
  "almacenamiento",
  "picking",
  "packing",
  "staging",
  "cuarentena",
  "dañados",
  "devoluciones",
  "despacho",
  "overflow",
  "virtual",
];

export interface Location {
  id: string;
  warehouseId: string;
  code: string;
  type: LocationType;
  parentId: string | null;
  virtual: boolean;
}

export function isWarehouse(x: unknown): x is Warehouse {
  if (x === null || typeof x !== "object") return false;
  const w = x as Record<string, unknown>;
  return typeof w.id === "string" && typeof w.name === "string" && typeof w.code === "string";
}

export function isLocation(x: unknown): x is Location {
  if (x === null || typeof x !== "object") return false;
  const l = x as Record<string, unknown>;
  return (
    typeof l.id === "string" &&
    typeof l.warehouseId === "string" &&
    typeof l.code === "string" &&
    typeof l.type === "string"
  );
}

/** Quarantine and damaged locations are never sellable. */
export function isNonSellable(type: LocationType): boolean {
  return type === "cuarentena" || type === "dañados";
}

export function validateWarehouse(
  existing: Warehouse[],
  input: { id?: string; name: string; code: string },
): { ok: boolean; error?: string } {
  const name = input.name.trim();
  const code = input.code.trim();
  if (!name) return { ok: false, error: "El nombre es obligatorio." };
  if (!code) return { ok: false, error: "El código es obligatorio." };
  const others = existing.filter((w) => w.id !== input.id);
  if (others.some((w) => w.code.trim().toLowerCase() === code.toLowerCase())) {
    return { ok: false, error: "Ya existe un almacén con ese código." };
  }
  return { ok: true };
}

/** Would setting `childId`'s parent to `newParentId` create a cycle? */
export function locationCycle(
  locations: Pick<Location, "id" | "parentId">[],
  childId: string,
  newParentId: string | null,
): boolean {
  if (newParentId === null) return false;
  if (newParentId === childId) return true;
  const byId = new Map(locations.map((l) => [l.id, l]));
  const seen = new Set<string>();
  let cursor: string | null = newParentId;
  while (cursor) {
    if (cursor === childId) return true;
    if (seen.has(cursor)) return true;
    seen.add(cursor);
    cursor = byId.get(cursor)?.parentId ?? null;
  }
  return false;
}

export function validateLocation(
  locationsInWarehouse: Location[],
  input: { id?: string; code: string; parentId: string | null },
): { ok: boolean; error?: string } {
  const code = input.code.trim();
  if (!code) return { ok: false, error: "El código es obligatorio." };
  const others = locationsInWarehouse.filter((l) => l.id !== input.id);
  if (others.some((l) => l.code.trim().toLowerCase() === code.toLowerCase())) {
    return { ok: false, error: "El código debe ser único dentro del almacén." };
  }
  if (input.parentId && !locationsInWarehouse.some((l) => l.id === input.parentId)) {
    return { ok: false, error: "La ubicación padre no existe en este almacén." };
  }
  if (input.id && locationCycle(locationsInWarehouse, input.id, input.parentId)) {
    return { ok: false, error: "Esa relación crearía un ciclo de ubicaciones." };
  }
  return { ok: true };
}
