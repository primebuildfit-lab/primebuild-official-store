import { cn } from "@/lib/cn";

/**
 * Honest value primitives (PBOS-001 · ORDEN 0.D). Quantities keep their unit and
 * money keeps its currency; neither is ever assumed, converted, or rounded in a
 * way that alters meaning. When a value is absent it reads "No medido" — never 0.
 */

/** Count the decimal places a finite number actually carries. */
export function decimalPlaces(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const s = String(n);
  const i = s.indexOf(".");
  return i === -1 ? 0 : s.length - i - 1;
}

/**
 * Format an amount in an explicit currency. Preserves the value's own precision
 * (min 2 fraction digits) unless the caller caps it, so costs are never silently
 * truncated. An unknown currency code falls back to a plain grouped number plus
 * the code — it does not guess a symbol.
 */
export function formatMoney(
  amount: number,
  currency: string,
  maximumFractionDigits?: number,
): string {
  const digits = maximumFractionDigits ?? Math.max(2, decimalPlaces(amount));
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    const n = new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(amount);
    return `${n} ${currency}`;
  }
}

/**
 * A monetary value. Requires an explicit currency; if the amount is missing it
 * renders "No medido", and if the currency is missing it shows the number with a
 * clear "moneda no definida" marker instead of assuming one.
 */
export function MoneyValue({
  amount,
  currency,
  maximumFractionDigits,
  notMeasured = "No medido",
  className,
}: {
  amount?: number | null;
  currency?: string | null;
  maximumFractionDigits?: number;
  notMeasured?: string;
  className?: string;
}) {
  if (amount == null || !Number.isFinite(amount)) {
    return <span className={cn("text-faint", className)}>{notMeasured}</span>;
  }
  const digits = maximumFractionDigits ?? Math.max(2, decimalPlaces(amount));
  if (!currency) {
    return (
      <span className={cn("tabular-nums", className)} title="Moneda no definida">
        {new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(amount)}{" "}
        <span className="text-warn">· moneda no definida</span>
      </span>
    );
  }
  return (
    <span className={cn("tabular-nums", className)}>
      {formatMoney(amount, currency, maximumFractionDigits)}
    </span>
  );
}

/**
 * A quantity. Shows the value with the unit exactly as the consumer provides it —
 * unit, package, box or pallet — and never assumes an equivalence between them.
 * A missing value renders "No medido"; a missing unit is flagged, not invented.
 */
export function QuantityValue({
  value,
  unit,
  notMeasured = "No medido",
  className,
}: {
  value?: number | null;
  unit?: string | null;
  notMeasured?: string;
  className?: string;
}) {
  if (value == null || !Number.isFinite(value)) {
    return <span className={cn("text-faint", className)}>{notMeasured}</span>;
  }
  const n = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: decimalPlaces(value),
  }).format(value);
  if (!unit) {
    return (
      <span className={cn("tabular-nums", className)} title="Unidad no definida">
        {n} <span className="text-warn">· sin unidad</span>
      </span>
    );
  }
  return (
    <span className={cn("tabular-nums", className)}>
      {n} <span className="text-muted">{unit}</span>
    </span>
  );
}
