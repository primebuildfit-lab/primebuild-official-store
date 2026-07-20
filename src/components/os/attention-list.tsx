import Link from "next/link";
import { Icon, type IconName } from "@/components/ds";

/**
 * "Requiere atención" list (PBOS-001 · ORDEN 1). It renders only real items the
 * page derives from real signals — it never manufactures alerts. With no items
 * it shows an honest "nada requiere atención" state and says why the operational
 * sources may still be empty.
 */

export type AttentionSeverity = "info" | "warning" | "critical";

export interface AttentionItem {
  id: string;
  severity: AttentionSeverity;
  title: string;
  detail?: string;
  /** How old the signal is, pre-formatted. Optional. */
  age?: string;
  /** Where the signal came from, e.g. "Shopify", "Official Store". */
  source?: string;
  href?: string;
  actionLabel?: string;
}

const SEVERITY: Record<AttentionSeverity, { dot: string; icon: IconName }> = {
  info: { dot: "bg-sky-400", icon: "activity" },
  warning: { dot: "bg-amber-400", icon: "alert" },
  critical: { dot: "bg-red-400", icon: "alert" },
};

export function AttentionList({
  items,
  emptyNote,
}: {
  items: AttentionItem[];
  /** Honest explanation shown when there is nothing to attend to. */
  emptyNote?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface/40 p-8 text-center">
        <span className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface-muted text-ok">
          <Icon name="check" size={16} />
        </span>
        <p className="text-sm font-medium text-muted">Nada requiere atención ahora.</p>
        {emptyNote ? <p className="max-w-md text-xs text-faint">{emptyNote}</p> : null}
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((it) => {
        const sev = SEVERITY[it.severity];
        const body = (
          <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5 transition-colors hover:border-border-strong">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${sev.dot}`} aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="text-sm font-medium">{it.title}</p>
                {it.age ? <span className="text-xs tabular-nums text-faint">{it.age}</span> : null}
              </div>
              {it.detail ? <p className="mt-0.5 text-xs text-muted">{it.detail}</p> : null}
              <div className="mt-1.5 flex items-center gap-2 text-[0.68rem] text-faint">
                {it.source ? <span>Fuente: {it.source}</span> : null}
                {it.href ? (
                  <span className="flex items-center gap-0.5 text-accent">
                    {it.actionLabel ?? "Abrir"}
                    <Icon name="chevron-right" size={12} />
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        );
        return (
          <li key={it.id}>
            {it.href ? (
              <Link href={it.href} className="block">
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ul>
  );
}
