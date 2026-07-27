import { Icon, type IconName } from "./icon";

/**
 * A read-only activity/audit timeline (PBOS-001 · ORDEN 0.B/D). It renders real
 * events supplied by the consumer and nothing else: with an empty list it shows
 * an honest "sin actividad" state rather than inventing history.
 */

export interface ActivityEvent {
  id: string;
  /** A human-readable summary of what happened. */
  title: string;
  /** Pre-formatted timestamp. */
  at: string;
  actor?: string;
  description?: string;
  icon?: IconName;
}

export function ActivityTimeline({
  events,
  emptyMessage = "Sin actividad registrada.",
}: {
  events: ActivityEvent[];
  emptyMessage?: string;
}) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface/40 p-8 text-center">
        <span className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface-muted text-faint">
          <Icon name="activity" size={16} />
        </span>
        <p className="text-sm text-muted">{emptyMessage}</p>
        <p className="text-xs text-faint">
          Los eventos reales aparecerán aquí con su fecha y autor.
        </p>
      </div>
    );
  }

  return (
    <ol className="relative ml-2 flex flex-col gap-4 border-l border-border pl-5">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span
            className="absolute -left-[1.42rem] top-1 grid h-5 w-5 place-items-center rounded-full border border-border bg-surface text-faint"
            aria-hidden
          >
            <Icon name={e.icon ?? "check"} size={11} />
          </span>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <p className="text-sm font-medium">{e.title}</p>
            <p className="text-xs tabular-nums text-faint">{e.at}</p>
          </div>
          {e.description ? <p className="mt-0.5 text-xs text-muted">{e.description}</p> : null}
          {e.actor ? <p className="mt-0.5 text-[0.68rem] text-faint">Por {e.actor}</p> : null}
        </li>
      ))}
    </ol>
  );
}
