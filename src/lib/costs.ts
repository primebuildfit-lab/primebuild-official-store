/**
 * Pure cost/margin logic (PBOS-001 · ORDEN 23). Every calculation states its
 * formula, the components included and missing, its currency and its state. It
 * never mixes currencies or converts implicitly, never shows a zero margin when
 * data is missing (uses "No medido"/"Fuente incompleta"), and never calls an
 * estimated landed cost "confirmed". It never touches CoinOS balances.
 */

export type CalcState = "calculado" | "estimado" | "parcial" | "no-medido" | "fuente-incompleta";

export interface CostComponents {
  currency: string;
  /** Purchase cost is the base; the rest are optional add-ons. */
  purchase?: number | null;
  discount?: number | null;
  freight?: number | null;
  insurance?: number | null;
  duties?: number | null;
  nonRecoverableTaxes?: number | null;
  receiving?: number | null;
  handling?: number | null;
  other?: number | null;
}

const LANDED_KEYS: (keyof CostComponents)[] = [
  "purchase",
  "freight",
  "insurance",
  "duties",
  "nonRecoverableTaxes",
  "receiving",
  "handling",
  "other",
];

export interface LandedCost {
  value: number | null;
  currency: string;
  state: CalcState;
  included: string[];
  missing: string[];
  formula: string;
}

/**
 * Landed cost from known components minus discount. Always "estimado" (never
 * "confirmado") while any expected component is missing; null (no-medido) if the
 * base purchase cost is unknown.
 */
export function computeLandedCost(c: CostComponents): LandedCost {
  const included: string[] = [];
  const missing: string[] = [];
  let sum = 0;
  for (const k of LANDED_KEYS) {
    const v = c[k] as number | null | undefined;
    if (v == null || !Number.isFinite(v)) missing.push(k);
    else {
      sum += v;
      included.push(k);
    }
  }
  const discount = c.discount ?? 0;
  if (c.purchase == null || !Number.isFinite(c.purchase)) {
    return {
      value: null,
      currency: c.currency,
      state: "no-medido",
      included,
      missing,
      formula: "landed = compra + fletes + … − descuento",
    };
  }
  const value = sum - (Number.isFinite(discount) ? discount : 0);
  // If only some add-ons are present it is an estimate, never confirmed.
  const state: CalcState = missing.length === 0 ? "calculado" : "estimado";
  return {
    value,
    currency: c.currency,
    state,
    included,
    missing,
    formula: `landed = ${included.join(" + ")}${discount ? " − descuento" : ""} = ${value}`,
  };
}

export interface MarginResult {
  value: number | null;
  pct: number | null;
  state: CalcState;
  note?: string;
}

/**
 * Margin = price − landed cost. Missing inputs or mismatched currencies yield a
 * null margin (never 0). No implicit conversion.
 */
export function computeMargin(
  price: number | null | undefined,
  priceCurrency: string | null | undefined,
  landed: LandedCost,
): MarginResult {
  if (price == null || !Number.isFinite(price)) {
    return { value: null, pct: null, state: "fuente-incompleta", note: "Falta precio de venta." };
  }
  if (landed.value == null) {
    return { value: null, pct: null, state: "fuente-incompleta", note: "Falta costo (landed)." };
  }
  if (!priceCurrency || priceCurrency !== landed.currency) {
    return {
      value: null,
      pct: null,
      state: "fuente-incompleta",
      note: "Monedas distintas: no se convierte implícitamente.",
    };
  }
  const value = price - landed.value;
  const pct = price !== 0 ? value / price : null;
  const state: CalcState = landed.state === "calculado" ? "calculado" : "estimado";
  return { value, pct, state };
}

/** Cost variation between the last two costs of a SKU (same currency only). */
export function costVariation(
  costs: { at: string; value: number; currency: string }[],
): { last: number; previous: number; delta: number; currency: string } | null {
  if (costs.length < 2) return null;
  const sorted = [...costs].sort((a, b) => (a.at < b.at ? 1 : -1));
  const [last, previous] = sorted;
  if (!last || !previous || last.currency !== previous.currency) return null;
  return {
    last: last.value,
    previous: previous.value,
    delta: last.value - previous.value,
    currency: last.currency,
  };
}

export const CALC_STATE_LABEL: Record<CalcState, string> = {
  calculado: "Calculado",
  estimado: "Estimado",
  parcial: "Parcial",
  "no-medido": "No medido",
  "fuente-incompleta": "Fuente incompleta",
};
