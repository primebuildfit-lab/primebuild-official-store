"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ds";

/**
 * The topbar task center (PBOS-001 · ORDEN 0.B). It opens a popover of the
 * operator's Official Store tasks. It invents no tasks: with an empty collection
 * it shows an honest "sin tareas" state, and it only ever renders real items the
 * app passes in. The full task space is PBOS-TASKS-001.
 */

export interface TopbarTask {
  id: string;
  title: string;
  href?: string;
  meta?: string;
}

export function TaskCenter({ tasks = [] }: { tasks?: TopbarTask[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const count = tasks.length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={count > 0 ? `Tareas: ${count}` : "Tareas"}
        className="relative grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Icon name="bell" size={16} />
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[0.6rem] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="core-rise absolute right-0 top-11 z-40 w-72 overflow-hidden rounded-xl border border-border bg-elevated shadow-[var(--shadow-e3)]"
        >
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-2.5">
            <p className="text-sm font-semibold">Tareas</p>
            <Link
              href="/tasks"
              onClick={() => setOpen(false)}
              className="text-xs text-accent hover:underline"
            >
              Ver todas
            </Link>
          </div>
          {count === 0 ? (
            <div className="flex flex-col items-center gap-1.5 px-4 py-8 text-center">
              <span className="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface-muted text-faint">
                <Icon name="check" size={15} />
              </span>
              <p className="text-sm text-muted">Sin tareas.</p>
              <p className="text-xs text-faint">Las tareas reales aparecerán aquí.</p>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {tasks.map((t) => (
                <li key={t.id}>
                  <Link
                    href={t.href ?? "/tasks"}
                    onClick={() => setOpen(false)}
                    className="flex flex-col gap-0.5 px-4 py-2.5 transition-colors hover:bg-surface-muted/60"
                  >
                    <span className="text-sm font-medium">{t.title}</span>
                    {t.meta ? <span className="text-xs text-faint">{t.meta}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
