import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";

/**
 * A premium metric tile for the commercial dashboards. The value is always a
 * pre-formatted string — nothing here computes or fabricates a number. An
 * optional `accent` tile gets the commerce gradient wash for the hero KPI.
 */
export function KpiCard({
  label,
  value,
  hint,
  icon,
  accent,
  chart,
  className,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  icon?: IconName;
  accent?: boolean;
  /** Optional honest visual (e.g. a sparkline) rendered under the value. */
  chart?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "core-rise relative overflow-hidden rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-e1)] transition-all duration-200 hover:border-border-strong hover:shadow-[var(--shadow-e2)]",
        accent && "core-accent-wash",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.7rem] font-medium uppercase tracking-wider text-faint">{label}</p>
        {icon ? (
          <span
            className={cn(
              "grid h-7 w-7 place-items-center rounded-lg border border-border bg-surface-muted",
              accent ? "text-accent" : "text-muted",
            )}
          >
            <Icon name={icon} size={15} />
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-bold tabular-nums tracking-tight",
          accent && "core-gradient-text",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      {chart ? <div className="mt-3">{chart}</div> : null}
    </div>
  );
}

/**
 * A tiny up/down trend delta. Callers pass a real, already-computed direction —
 * this is styling only, it does not infer trends from data.
 */
export function TrendDelta({ dir, children }: { dir: "up" | "down" | "flat"; children: ReactNode }) {
  const tone =
    dir === "up" ? "text-ok" : dir === "down" ? "text-err" : "text-faint";
  const icon: IconName | null = dir === "up" ? "arrow-up" : dir === "down" ? "arrow-down" : null;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium tabular-nums", tone)}>
      {icon ? <Icon name={icon} size={12} /> : null}
      {children}
    </span>
  );
}
