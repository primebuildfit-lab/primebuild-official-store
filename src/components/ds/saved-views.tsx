"use client";

import { cn } from "@/lib/cn";
import { Icon } from "./icon";

/**
 * A saved-views switcher (PBOS-001 · ORDEN 0.D). It can start with no saved
 * views, and it distinguishes a TEMPORARY view (session-only, not stored) from a
 * PERSISTED one — it never fakes persistence. Saving is only offered when the
 * consumer wires a real `onSaveCurrent`.
 */

export interface SavedView {
  id: string;
  label: string;
  /** true when this view is really stored; false = temporary/session-only. */
  persisted: boolean;
}

export function SavedViews({
  views,
  activeId,
  onSelect,
  onSaveCurrent,
  className,
}: {
  views: SavedView[];
  activeId?: string;
  onSelect: (id: string) => void;
  /** When provided, a "Guardar vista" affordance appears. */
  onSaveCurrent?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {views.length === 0 ? (
        <span className="text-xs text-faint">Sin vistas guardadas.</span>
      ) : (
        views.map((v) => {
          const active = v.id === activeId;
          return (
            <button
              key={v.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(v.id)}
              title={v.persisted ? "Vista guardada" : "Vista temporal (no guardada)"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "border-primary/40 bg-primary/15 text-accent"
                  : "border-border bg-surface text-muted hover:border-border-strong hover:text-foreground",
              )}
            >
              {v.label}
              {!v.persisted ? (
                <span className="text-[0.6rem] uppercase tracking-wide text-faint">temporal</span>
              ) : null}
            </button>
          );
        })
      )}
      {onSaveCurrent ? (
        <button
          type="button"
          onClick={onSaveCurrent}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-xs font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icon name="check" size={12} />
          Guardar vista
        </button>
      ) : null}
    </div>
  );
}
