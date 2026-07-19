import { cn } from "@/lib/cn";

/**
 * Loading + placeholder primitives: an indeterminate spinner and content
 * skeletons. Used while data resolves; they never stand in for real data once it
 * arrives.
 */

export function Spinner({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      style={{ width: size, height: size, borderWidth: Math.max(2, Math.round(size / 9)) }}
      className={cn(
        "core-spin inline-block rounded-full border-current border-t-transparent text-accent",
        className,
      )}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <span className={cn("core-shimmer block rounded-md", className)} aria-hidden />;
}

/** A convenience skeleton for a table-ish block of rows. */
export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
