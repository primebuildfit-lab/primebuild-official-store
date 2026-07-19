"use client";

import { cn } from "@/lib/cn";

/**
 * A controlled segmented control / tab strip. Presentational only — the caller
 * owns the active value and decides what each option shows. Good for switching
 * views without navigating.
 */
export interface TabOption {
  value: string;
  label: string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  className,
}: {
  options: TabOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-border bg-surface p-1",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-surface-muted text-foreground shadow-[var(--shadow-e1)]"
                : "text-muted hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
