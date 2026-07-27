/**
 * Pure replenishment logic (PBOS-001 · ORDEN 15). Suggestions are computed from
 * REAL inputs only (target stock from a policy, available from the ledger,
 * incoming from purchase orders). No sales, demand or lead time is invented; if a
 * required input is missing, no quantity is produced — the missing inputs are
 * listed instead. A suggestion never creates or sends an order, never changes
 * inventory, a supplier, or Shopify. This is a deterministic formula, not "IA".
 */

export const REPLENISHMENT_SCHEMA_VERSION = 1;

export interface ReplenishmentPolicy {
  id: string;
  name: string;
  warehouseCode: string;
  sku: string;
  preferredSupplier?: string;
  reorderPoint?: number | null;
  targetStock?: number | null;
  safetyStock?: number | null;
  leadTimeDays?: number | null;
  moq?: number | null;
  multiple?: number | null;
  status: "activa" | "pausada" | "archivada";
  version: number;
  createdAt: string;
}

export function isPolicy(x: unknown): x is ReplenishmentPolicy {
  if (x === null || typeof x !== "object") return false;
  const p = x as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    typeof p.warehouseCode === "string" &&
    typeof p.sku === "string"
  );
}

export function validatePolicy(
  existing: ReplenishmentPolicy[],
  input: { id?: string; name: string; sku: string; warehouseCode: string },
): { ok: boolean; error?: string } {
  if (!input.name.trim()) return { ok: false, error: "El nombre es obligatorio." };
  if (!input.sku.trim()) return { ok: false, error: "El SKU es obligatorio." };
  if (!input.warehouseCode.trim()) return { ok: false, error: "El almacén es obligatorio." };
  const others = existing.filter((p) => p.id !== input.id);
  if (
    others.some(
      (p) =>
        p.sku.trim().toLowerCase() === input.sku.trim().toLowerCase() &&
        p.warehouseCode === input.warehouseCode,
    )
  ) {
    return { ok: false, error: "Ya existe una política para ese SKU y almacén." };
  }
  return { ok: true };
}

/** Round a base quantity up to the purchase multiple and respect MOQ. */
export function applyLot(
  base: number,
  moq: number | null | undefined,
  multiple: number | null | undefined,
): number {
  let q = Math.max(0, Math.ceil(base));
  if (q === 0) return 0;
  if (multiple && multiple > 0) q = Math.ceil(q / multiple) * multiple;
  if (moq && q < moq) {
    q = moq;
    if (multiple && multiple > 0) q = Math.ceil(q / multiple) * multiple;
  }
  return q;
}

export interface SuggestionInputs {
  available: number;
  incoming?: number | null;
}

export interface Suggestion {
  qty: number | null;
  unit: string;
  formula: string;
  inputsUsed: Record<string, number | string>;
  missing: string[];
  limitations: string[];
  preferredSupplier?: string;
}

/**
 * Compute a replenishment suggestion for a policy. Requires a target stock;
 * without it, returns qty=null and lists the missing input. Uses available and
 * incoming from real sources; demand is not used (and its absence is stated as a
 * limitation), never invented.
 */
export function computeSuggestion(
  policy: ReplenishmentPolicy,
  inputs: SuggestionInputs,
): Suggestion {
  const missing: string[] = [];
  if (policy.targetStock == null) missing.push("stock objetivo");
  const limitations = ["Sin demanda observada: la cobertura por días no se calcula."];

  const inputsUsed: Record<string, number | string> = {
    disponible: inputs.available,
    incoming: inputs.incoming ?? 0,
  };
  if (policy.targetStock != null) inputsUsed["stock objetivo"] = policy.targetStock;
  if (policy.reorderPoint != null) inputsUsed["punto de reposición"] = policy.reorderPoint;

  if (missing.length > 0) {
    return {
      qty: null,
      unit: "unidad",
      formula: "objetivo − (disponible + incoming), redondeado a múltiplo, ≥ MOQ",
      inputsUsed,
      missing,
      limitations,
      preferredSupplier: policy.preferredSupplier,
    };
  }

  const projected = inputs.available + (inputs.incoming ?? 0);
  // Only suggest when below the reorder point (if set) or below target.
  const trigger = policy.reorderPoint ?? policy.targetStock!;
  if (inputs.available > trigger) {
    return {
      qty: 0,
      unit: "unidad",
      formula: `disponible (${inputs.available}) > umbral (${trigger}) → sin reposición`,
      inputsUsed,
      missing: [],
      limitations,
      preferredSupplier: policy.preferredSupplier,
    };
  }

  const base = policy.targetStock! - projected;
  const qty = applyLot(base, policy.moq, policy.multiple);
  return {
    qty,
    unit: "unidad",
    formula: `${policy.targetStock} − (${inputs.available} + ${inputs.incoming ?? 0}) = ${base}; lote → ${qty}`,
    inputsUsed,
    missing: [],
    limitations,
    preferredSupplier: policy.preferredSupplier,
  };
}
