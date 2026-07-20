"use client";

import { cn } from "@/lib/cn";
import { Icon } from "./icon";

/**
 * A bulk-action bar (PBOS-001 · ORDEN 0.D). It stays hidden while nothing is
 * selected, and every action is supplied by the consuming space — the bar runs
 * no real operation itself and invents no actions. Destructive actions rely on
 * the consumer to gate them by capability and confirmation.
 */

export interface BulkAction {
  id: string;
  label: string;
  onRun: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}

export function BulkActionBar({
  count,
  actions,
  onClear,
  className,
}: {
  /** Number of selected rows. When 0 the bar renders nothing. */
  count: number;
  actions: BulkAction[];
  onClear?: () => void;
  className?: string;
}) {
  if (count <= 0) return null;

  return (
    <div
      role="toolbar"
      aria-label="Acciones en lote"
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-border bg-elevated px-3 py-2 shadow-[var(--shadow-e2)]",
        className,
      )}
    >
      <span className="text-sm font-medium">
        {count} <span className="text-muted">seleccionado{count === 1 ? "" : "s"}</span>
      </span>
      <div className="ml-2 flex flex-wrap items-center gap-1.5">
        {actions.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={a.onRun}
            disabled={a.disabled}
            className={cn(
              "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
              a.tone === "danger"
                ? "border-red-500/30 text-red-300 hover:bg-red-500/10"
                : "border-border text-muted hover:border-border-strong hover:text-foreground",
            )}
          >
            {a.label}
          </button>
        ))}
      </div>
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Limpiar selección"
        >
          <Icon name="x" size={15} />
        </button>
      ) : null}
    </div>
  );
}
