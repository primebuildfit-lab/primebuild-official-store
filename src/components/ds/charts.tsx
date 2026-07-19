import { cn } from "@/lib/cn";

/**
 * Lightweight, dependency-free inline-SVG chart primitives. They render ONLY the
 * real values passed in; when there is no data they render nothing (the caller
 * shows an honest empty state). No axes libraries, no fabricated series.
 */

/** A compact sparkline for trend context inside a KPI tile. */
export function Sparkline({
  data,
  width = 120,
  height = 32,
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / span) * (height - 4) - 2;
    return [x, y] as const;
  });
  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn("overflow-visible", className)}
      aria-hidden
    >
      <path d={area} fill="var(--accent)" opacity={0.12} />
      <path
        d={line}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface BarDatum {
  label: string;
  value: number;
}

/** A horizontal mini bar-chart for small categorical breakdowns. */
export function MiniBars({ data, className }: { data: BarDatum[]; className?: string }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value)) || 1;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3 text-xs">
          <span className="w-28 shrink-0 truncate text-muted">{d.label}</span>
          <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
            <span
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: `${(d.value / max) * 100}%`, background: "var(--gradient-accent)" }}
            />
          </span>
          <span className="w-8 shrink-0 text-right font-medium tabular-nums text-foreground">
            {d.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** A donut ring showing a single real proportion (e.g. share of a whole). */
export function DonutStat({
  value,
  total,
  label,
  size = 84,
  className,
}: {
  value: number;
  total: number;
  label?: string;
  size?: number;
  className?: string;
}) {
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-muted)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(c * pct).toFixed(1)} ${c.toFixed(1)}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-foreground text-sm font-bold"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {Math.round(pct * 100)}%
        </text>
      </svg>
      {label ? <span className="text-xs text-muted">{label}</span> : null}
    </div>
  );
}
