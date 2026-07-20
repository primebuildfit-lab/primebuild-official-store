"use client";

import { cn } from "@/lib/cn";
import { Icon } from "./icon";

/**
 * A sticky "you have unsaved changes" bar (PBOS-001 · ORDEN 0.B). Presentational:
 * it appears only while `visible`, and its Save action is disabled unless the
 * consumer wires a real `onSave` — it never fakes a save or shows a persistent
 * success. Discard is likewise a no-op unless `onDiscard` is provided.
 */
export function UnsavedChangesBar({
  visible,
  message = "Tienes cambios sin guardar.",
  saving = false,
  onSave,
  onDiscard,
  className,
}: {
  visible: boolean;
  message?: string;
  saving?: boolean;
  onSave?: () => void;
  onDiscard?: () => void;
  className?: string;
}) {
  if (!visible) return null;
  return (
    <div
      role="status"
      className={cn(
        "sticky bottom-4 z-20 mx-auto flex w-fit max-w-full items-center gap-3 rounded-xl border border-border bg-elevated px-4 py-2.5 shadow-[var(--shadow-e3)]",
        className,
      )}
    >
      <span className="flex items-center gap-2 text-sm text-muted">
        <Icon name="alert" size={15} className="text-warn" />
        {message}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDiscard}
          disabled={!onDiscard || saving}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Descartar
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!onSave || saving}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
