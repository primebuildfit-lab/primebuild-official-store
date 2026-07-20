import type { ReactNode } from "react";
import { Card } from "./card";
import { Icon, type IconName } from "./icon";

/**
 * The single, honest source of "there is nothing real to show yet" states for
 * the whole commerce admin (PBOS-001 · ORDEN 0.E). Every screen that lacks a
 * connected source, real data, a measurement, permission, or an implementation
 * says so plainly here — it never infers "operativo" or "saludable" from the
 * mere absence of an error, and it never fabricates data to fill the space.
 *
 * `HonestState` is the primitive; the named presets below fix the wording and
 * tone for each canonical case so they read consistently everywhere.
 */

export type HonestStateTone = "neutral" | "warn" | "info";

const TONE_ICON_CLASS: Record<HonestStateTone, string> = {
  neutral: "text-faint",
  warn: "text-warn",
  info: "text-accent",
};

export function HonestState({
  icon = "alert",
  title,
  description,
  tone = "neutral",
  children,
}: {
  icon?: IconName;
  title: string;
  description?: ReactNode;
  tone?: HonestStateTone;
  /** Optional extra content: what is needed, an action, a code block, etc. */
  children?: ReactNode;
}) {
  return (
    <Card className="border-dashed">
      <div className="flex flex-col gap-2 p-6">
        <div className="flex items-center gap-2.5">
          <span
            className={`grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface-muted ${TONE_ICON_CLASS[tone]}`}
          >
            <Icon name={icon} size={16} />
          </span>
          <p className="text-sm font-semibold">{title}</p>
        </div>
        {description ? <div className="max-w-2xl text-sm text-muted">{description}</div> : null}
        {children}
      </div>
    </Card>
  );
}

/** "Aún no existen datos" — a real source is connected but has no rows yet. */
export function NoData({
  message = "Aún no existen datos.",
  icon = "package",
}: {
  message?: string;
  icon?: IconName;
}) {
  return (
    <HonestState icon={icon} title={message}>
      <p className="text-xs text-faint">Cuando existan datos reales, aparecerán aquí.</p>
    </HonestState>
  );
}

/** "No conectado" / "Fuente no conectada" — the data source is not connected. */
export function ConnectionState({
  source = "La fuente de datos",
  needed,
}: {
  source?: string;
  /** What is needed to connect, shown honestly. */
  needed?: ReactNode;
}) {
  return (
    <HonestState icon="plug" tone="warn" title={`${source} no conectada.`}>
      {needed ? <div className="text-sm text-muted">{needed}</div> : null}
      <p className="text-xs text-faint">
        No se infiere conexión ni salud por ausencia de errores. Hasta conectarla, este estado vacío
        es honesto: no se inventan datos.
      </p>
    </HonestState>
  );
}

/** "Sin permisos" — the operator lacks the capability for this screen. */
export function PermissionState({
  capability,
}: {
  /** The capability the operator is missing, if known. */
  capability?: string;
}) {
  return (
    <HonestState icon="shield" tone="warn" title="Sin permisos para ver esto.">
      <p className="text-sm text-muted">
        Tu rol no incluye {capability ? <strong>{capability}</strong> : "la capacidad requerida"}.
        La autoridad de identidad y permisos vive en Platform Nexus.
      </p>
    </HonestState>
  );
}

/** "Error" — an operation failed. Shows the real message, never a fake one. */
export function ErrorState({
  title = "No se pudo completar la operación.",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <HonestState icon="alert" tone="warn" title={title}>
      {message ? <p className="text-sm text-muted">{message}</p> : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 w-fit rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Reintentar
        </button>
      ) : null}
    </HonestState>
  );
}

/** "No implementado" — a screen defined but not built in this phase. */
export function NotImplemented({ detail }: { detail?: ReactNode }) {
  return (
    <HonestState icon="sparkles" title="No implementado todavía.">
      {detail ? <p className="text-sm text-muted">{detail}</p> : null}
      <p className="text-xs text-faint">Esta capacidad se construye en una orden posterior.</p>
    </HonestState>
  );
}
