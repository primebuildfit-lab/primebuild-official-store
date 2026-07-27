"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

/**
 * A right-side detail panel (PBOS-001 · ORDEN 0.B/D). Opens over the content for
 * quick edits and inspection: closes on Escape, restores focus to the trigger on
 * close, locks body scroll, and shows an honest empty state when it has no
 * content. Presentational only — it holds no data of its own.
 */
export function DetailDrawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  emptyMessage = "Sin selección.",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  emptyMessage?: string;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    prevFocus.current = (document.activeElement as HTMLElement | null) ?? null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const raf = requestAnimationFrame(() => panelRef.current?.focus());
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(raf);
      prevFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : "Detalle"}
        className={cn(
          "core-rise relative flex h-full w-full max-w-md flex-col border-l border-border bg-elevated shadow-[var(--shadow-e3)] outline-none",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/70 px-5 py-3.5">
          <div className="min-w-0">
            {title ? <h3 className="text-sm font-semibold tracking-tight">{title}</h3> : null}
            {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Cerrar"
          >
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm">
          {children ?? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <span className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface-muted text-faint">
                <Icon name="box" size={16} />
              </span>
              <p className="text-sm text-muted">{emptyMessage}</p>
            </div>
          )}
        </div>
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-border/70 px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
