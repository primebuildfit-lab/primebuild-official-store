/**
 * Pure catalog logic (PBOS-001 · ORDEN 4) — validation for internal categories
 * and commercial collections. No data, no side effects; safe to unit-test.
 *
 * Categorías internas, colecciones comerciales and Shopify collections are three
 * distinct concepts and never mixed. Relationships to products use canonical ids,
 * never copies of the product.
 */

export type CatalogStatus = "activa" | "inactiva" | "archivada";

export interface InternalCategory {
  id: string;
  name: string;
  parentId: string | null;
  status: CatalogStatus;
}

export interface CommercialCollection {
  id: string;
  name: string;
  /** Manual list vs rule-based; both are operator-defined locally. */
  kind: "manual" | "reglas";
  status: CatalogStatus;
}

/** Case-insensitive, whitespace-trimmed duplicate check. */
export function isDuplicateName(existing: string[], name: string): boolean {
  const n = name.trim().toLowerCase();
  return existing.some((e) => e.trim().toLowerCase() === n);
}

/**
 * Would setting `childId`'s parent to `newParentId` create a hierarchy cycle?
 * Walks up the parent chain from the proposed parent; a cycle exists if it ever
 * reaches the child (or revisits a node). Setting parent to itself is a cycle.
 */
export function wouldCreateCycle(
  categories: Pick<InternalCategory, "id" | "parentId">[],
  childId: string,
  newParentId: string | null,
): boolean {
  if (newParentId === null) return false;
  if (newParentId === childId) return true;
  const byId = new Map(categories.map((c) => [c.id, c]));
  const seen = new Set<string>();
  let cursor: string | null = newParentId;
  while (cursor) {
    if (cursor === childId) return true;
    if (seen.has(cursor)) return true; // pre-existing cycle guard
    seen.add(cursor);
    cursor = byId.get(cursor)?.parentId ?? null;
  }
  return false;
}

/** Validate a new/renamed category name against siblings and cycle rules. */
export function validateCategory(
  categories: InternalCategory[],
  input: { id?: string; name: string; parentId: string | null },
): { ok: boolean; error?: string } {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "El nombre es obligatorio." };
  const others = categories.filter((c) => c.id !== input.id);
  if (
    isDuplicateName(
      others.map((c) => c.name),
      name,
    )
  ) {
    return { ok: false, error: "Ya existe una categoría con ese nombre." };
  }
  if (input.parentId && !categories.some((c) => c.id === input.parentId)) {
    return { ok: false, error: "La categoría padre no existe." };
  }
  if (input.id && wouldCreateCycle(categories, input.id, input.parentId)) {
    return { ok: false, error: "Esa relación crearía un ciclo de jerarquía." };
  }
  return { ok: true };
}
