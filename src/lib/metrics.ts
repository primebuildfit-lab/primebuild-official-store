/**
 * Pure metrics logic (PBOS-001 · ORDEN 24). Every metric carries a contract
 * (definition, formula, unit, source, state, limitations). Metrics are computed
 * only from real local sources; sales, rotation, coverage, margins and trends are
 * never invented (they read "No medido"). Incompatible warehouses/currencies/units
 * are never mixed. Analytics stays "Arquitectura de Analytics pendiente".
 */

import { deriveBalances, type InventoryMovement } from "./inventory";

export type MetricState = "medido" | "no-medido" | "parcial" | "pendiente";

export interface MetricContract {
  name: string;
  definition: string;
  formula: string;
  unit: string;
  source: string;
  state: MetricState;
  limitations?: string;
}

export interface MetricValue {
  contract: MetricContract;
  value: string | null;
}

/** Inventory totals derived from the ledger, optionally scoped to a warehouse. */
export function computeInventoryTotals(
  movements: InventoryMovement[],
  warehouse?: string,
): { lines: number; physical: number; onHand: number; damaged: number; quarantine: number } {
  const balances = deriveBalances(movements).filter(
    (b) => !warehouse || b.warehouseId === warehouse,
  );
  return balances.reduce(
    (acc, b) => ({
      lines: acc.lines + 1,
      physical: acc.physical + b.physical,
      onHand: acc.onHand + b.onHand,
      damaged: acc.damaged + b.damaged,
      quarantine: acc.quarantine + b.quarantine,
    }),
    { lines: 0, physical: 0, onHand: 0, damaged: 0, quarantine: 0 },
  );
}

/** Count items by a status field. */
export function countByStatus<T>(items: T[], statusOf: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of items) {
    const s = statusOf(it);
    out[s] = (out[s] ?? 0) + 1;
  }
  return out;
}

/** A metric that has no real source yet — honest, never a fabricated number. */
export function unmeasured(
  name: string,
  definition: string,
  reason: string,
  unit = "—",
): MetricValue {
  return {
    contract: {
      name,
      definition,
      formula: "—",
      unit,
      source: "sin fuente",
      state: "no-medido",
      limitations: reason,
    },
    value: null,
  };
}

/** A measured metric with its contract. */
export function measured(
  name: string,
  definition: string,
  formula: string,
  unit: string,
  source: string,
  value: string,
): MetricValue {
  return {
    contract: { name, definition, formula, unit, source, state: "medido" },
    value,
  };
}

export const ANALYTICS_STATUS = "Arquitectura de Analytics pendiente";
