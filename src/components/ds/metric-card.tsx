import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";

/**
 * An honest metric tile (PBOS-001 · ORDEN 0.D). Like KpiCard it never computes a
 * number, but it makes the absence of a measurement explicit: a null value reads
 * "No medido", never 0. The `source` line states where a real value would come
 * from so a metric without a source is visibly unmeasured, not blank.
 */
export function MetricCard({
  label,
  value,
  unit,
  hint,
  icon,
  source,
  notMeasured = "No medido",
  className,
}: {
  label: string;
  /** A pre-formatted value node, or null/undefined when there is no measurement. */
  value?: ReactNode;
  /** Optional unit shown after a measured value. */
  unit?: string;
  hint?: ReactNode;
  icon?: IconName;
  /** Honest provenance line, e.g. "Requiere Shopify" or "Fuente: recepciones". */
  source?: string;
  notMeasured?: string;
  className?: string;
}) {
  const measured = value != null && value !== "";
  return (
    <div
      className={cn(
        "core-rise relative overflow-hidden rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-e1)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.7rem] font-medium uppercase tracking-wider text-faint">{label}</p>
        {icon ? (
          <span className="grid h-7 w-7 place-items-center rounded-lg border border-border bg-surface-muted text-muted">
            <Icon name={icon} size={15} />
          </span>
        ) : null}
      </div>
      {measured ? (
        <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight">
          {value}
          {unit ? <span className="ml-1 text-sm font-medium text-muted">{unit}</span> : null}
        </p>
      ) : (
        <p className="mt-2 text-lg font-semibold text-faint">{notMeasured}</p>
      )}
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      {source ? <p className="mt-1 text-[0.68rem] text-faint">{source}</p> : null}
    </div>
  );
}
