"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

/**
 * A centered modal dialog with a scrim, Escape-to-close and body-scroll lock.
 * Presentational shell only — content and actions are provided by the caller.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-[8vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "core-rise relative flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-elevated shadow-[var(--shadow-e3)]",
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
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
              aria-label="Cerrar"
            >
              <Icon name="x" size={16} />
            </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-5 py-4 text-sm">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-border/70 px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
