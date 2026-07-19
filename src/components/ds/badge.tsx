import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Semantic badge kinds. Defined once so every status and label across the app
 * renders consistently. Adding a new kind = add one row here. Tuned for the
 * dark-first canvas (translucent fills + inset ring) while still legible on the
 * optional light theme.
 */
export type BadgeKind = "healthy" | "warning" | "critical" | "info" | "neutral" | "accent";

export const BADGE_KIND_CLASSES: Record<BadgeKind, string> = {
  healthy:
    "bg-emerald-500/12 text-emerald-300 ring-emerald-400/25 dark:bg-emerald-500/12 dark:text-emerald-300",
  warning: "bg-amber-500/12 text-amber-300 ring-amber-400/25",
  critical: "bg-red-500/12 text-red-300 ring-red-400/25",
  info: "bg-sky-500/12 text-sky-300 ring-sky-400/25",
  neutral: "bg-surface-muted text-muted ring-border-strong/60",
  accent: "bg-primary/15 text-accent ring-primary/30",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  kind?: BadgeKind;
}

/** A small pill for statuses and labels. Defaults to the neutral kind. */
export function Badge({ kind = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        BADGE_KIND_CLASSES[kind],
        className,
      )}
      {...props}
    />
  );
}

interface ChipProps extends HTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

/**
 * A selectable filter chip. Purely presentational state (`active`) — it does not
 * fetch or mutate anything; callers wire it to client-side view state.
 */
export function Chip({ active, className, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary/40 bg-primary/15 text-accent"
          : "border-border bg-surface text-muted hover:border-border-strong hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}
