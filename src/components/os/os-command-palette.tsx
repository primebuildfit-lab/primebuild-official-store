"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ds";
import { SECTIONS } from "@/config/sections";

/**
 * A command palette for jumping between sections. Opens on Ctrl/⌘+K. Purely
 * navigational — it lists the real section registry and nothing it can "do" is
 * fabricated.
 */
export function OsCommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.group.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  if (!open) return null;

  function go(href: string) {
    onClose();
    router.push(href);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="core-rise relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-elevated shadow-[var(--shadow-e3)]">
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <Icon name="search" size={16} className="shrink-0 text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const item = results[active];
                if (item) go(item.href);
              } else if (e.key === "Escape") {
                e.preventDefault();
                onClose();
              }
            }}
            placeholder="Buscar una sección…"
            className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-faint"
            aria-label="Buscar sección"
          />
        </div>
        <ul className="max-h-80 overflow-y-auto py-1.5">
          {results.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-faint">Sin coincidencias.</li>
          ) : (
            results.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(s.href)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                    i === active ? "bg-surface-muted" : "hover:bg-surface-muted/60",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border",
                      i === active ? "bg-surface text-accent" : "bg-surface-muted/50 text-faint",
                    )}
                  >
                    <Icon name={s.icon} size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{s.label}</span>
                    <span className="block truncate text-[0.72rem] text-faint">{s.summary}</span>
                  </span>
                  <span className="ml-auto text-[0.6rem] uppercase tracking-wider text-faint">
                    {s.group}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[0.65rem] text-faint">
          <span>↑↓ para navegar · ↵ para abrir · Esc para cerrar</span>
          <span>{results.length} secciones</span>
        </div>
      </div>
    </div>
  );
}
