"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

/**
 * A search / filter input with a leading icon. Controlled by the caller — it
 * does not fetch or filter data itself; it just captures a query for client-side
 * view state.
 */
export function SearchInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div
      className={cn(
        "flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm transition-colors focus-within:border-border-strong focus-within:ring-2 focus-within:ring-ring/40",
        className,
      )}
    >
      <Icon name="search" size={15} className="shrink-0 text-faint" />
      <input
        type="search"
        className="w-full bg-transparent text-foreground outline-none placeholder:text-faint"
        {...props}
      />
    </div>
  );
}

/**
 * A horizontal toolbar row for filters/search/actions above a table or grid.
 */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-center gap-2", className)}>{children}</div>
  );
}
