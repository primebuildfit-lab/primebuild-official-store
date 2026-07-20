import { Badge, type BadgeKind } from "./badge";

/**
 * A status badge that maps a lifecycle tone to a consistent colour (PBOS-001 ·
 * ORDEN 0.D). The commerce admin has many lifecycles (orders, purchases,
 * receipts, sync…); this fixes how their states read so "aprobada", "en tránsito"
 * or "con discrepancias" look the same everywhere. It carries no data — the
 * consumer supplies the label and its tone.
 */

export type StatusTone = "neutral" | "progress" | "positive" | "warning" | "critical" | "info";

const TONE_KIND: Record<StatusTone, BadgeKind> = {
  neutral: "neutral",
  progress: "info",
  positive: "healthy",
  warning: "warning",
  critical: "critical",
  info: "accent",
};

export function StatusBadge({
  label,
  tone = "neutral",
  title,
}: {
  label: string;
  tone?: StatusTone;
  title?: string;
}) {
  return (
    <Badge kind={TONE_KIND[tone]} title={title ?? label}>
      {label}
    </Badge>
  );
}
