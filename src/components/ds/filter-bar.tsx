"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

/**
 * A generic filter toolbar (PBOS-001 · ORDEN 0.D). It arranges a search box and
 * whatever DECLARATIVE filter controls the consuming space supplies as children —
 * it never ships invented commercial filters of its own. The clear affordance
 * appears only when the consumer wires `onClear`.
 */
export function FilterBar({
  search,
  onSearch,
  searchPlaceholder = "Buscar…",
  onClear,
  children,
  className,
}: {
  /** Controlled search value. Omit both search/onSearch to hide the search box. */
  search?: string;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  /** When provided, shows a "Limpiar" button. */
  onClear?: () => void;
  /** The space's declarative filter controls. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface/50 p-2",
        className,
      )}
      role="search"
    >
      {onSearch ? (
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-surface px-2.5 sm:max-w-xs">
          <Icon name="search" size={15} className="shrink-0 text-faint" />
          <input
            value={search ?? ""}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-transparent py-1.5 text-sm outline-none placeholder:text-faint"
            aria-label={searchPlaceholder}
          />
        </label>
      ) : null}
      {children}
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="ml-auto rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Limpiar
        </button>
      ) : null}
    </div>
  );
}
