/**
 * Pure pricing logic (PBOS-001 · ORDEN 5). Sale prices only — never supplier
 * costs. No implicit currency conversion, no mixing currencies, and an unknown
 * price is never represented as 0.
 */

/** A price is "unpriced" when it is absent, non-numeric, or exactly zero. */
export function isUnpriced(price: string | null | undefined): boolean {
  if (price == null || price.trim() === "") return true;
  const n = Number(price);
  return !Number.isFinite(n) || n === 0;
}

/** A local price list holds ONE currency; prices in it never mix currencies. */
export interface LocalPriceList {
  id: string;
  name: string;
  currency: string;
  status: "borrador" | "activa" | "archivada";
}

export function validatePriceList(
  existing: LocalPriceList[],
  input: { id?: string; name: string; currency: string },
): { ok: boolean; error?: string } {
  const name = input.name.trim();
  const currency = input.currency.trim().toUpperCase();
  if (!name) return { ok: false, error: "El nombre es obligatorio." };
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { ok: false, error: "La moneda debe ser un código ISO de 3 letras (p. ej. USD)." };
  }
  const others = existing.filter((l) => l.id !== input.id);
  if (others.some((l) => l.name.trim().toLowerCase() === name.toLowerCase())) {
    return { ok: false, error: "Ya existe una lista con ese nombre." };
  }
  return { ok: true };
}
