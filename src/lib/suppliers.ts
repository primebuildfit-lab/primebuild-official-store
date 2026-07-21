/**
 * Pure supplier logic (PBOS-001 · ORDEN 8). Suppliers are only ever what the
 * operator really registers — a documentary mention is not an integration, so
 * nothing is pre-created. The relationship distinguishes how a supplier's data
 * arrived (manual, registered, imported, connected) and whether it is verified.
 */

export type SupplierStatus = "activo" | "en-revision" | "bloqueado" | "retirado";
export type SupplierSource = "manual" | "registrado" | "importado" | "conectado";

export interface Supplier {
  id: string;
  name: string;
  status: SupplierStatus;
  /** How this supplier's data arrived. */
  source: SupplierSource;
  /** Verified only with evidence; defaults to false. */
  verified: boolean;
  currency?: string | null;
  leadTimeDays?: number | null;
  responsible?: string;
  notes?: string;
  createdAt: string;
}

export function validateSupplier(
  existing: Supplier[],
  input: { id?: string; name: string; currency?: string },
): { ok: boolean; error?: string } {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "El nombre es obligatorio." };
  const others = existing.filter((s) => s.id !== input.id);
  if (others.some((s) => s.name.trim().toLowerCase() === name.toLowerCase())) {
    return { ok: false, error: "Ya existe un proveedor con ese nombre." };
  }
  const currency = (input.currency ?? "").trim().toUpperCase();
  if (currency && !/^[A-Z]{3}$/.test(currency)) {
    return { ok: false, error: "La moneda debe ser un código ISO de 3 letras (o vacío)." };
  }
  return { ok: true };
}

export function sourceLabel(source: SupplierSource): string {
  switch (source) {
    case "manual":
      return "Registrado manualmente";
    case "registrado":
      return "Registrado";
    case "importado":
      return "Datos importados";
    case "conectado":
      return "Catálogo conectado";
  }
}
