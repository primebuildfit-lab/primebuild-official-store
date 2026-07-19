import { cn } from "@/lib/cn";

/**
 * A small status indicator dot. `live` adds the calm pulse used for real-time
 * connections. Colour maps to the semantic tone, never fabricated.
 */
export type StatusTone = "ok" | "warn" | "err" | "info" | "idle";

const TONE: Record<StatusTone, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  err: "bg-err",
  info: "bg-info",
  idle: "bg-faint",
};

export function StatusDot({
  tone = "idle",
  live,
  className,
}: {
  tone?: StatusTone;
  live?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block h-1.5 w-1.5 rounded-full", TONE[tone], live && "core-live", className)}
      aria-hidden
    />
  );
}
