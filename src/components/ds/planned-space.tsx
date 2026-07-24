import { Card } from "./card";
import { Icon } from "./icon";

/**
 * Honest "planned space" state. A commercial space the PrimeBuild Official Store
 * rebuild (PBOS-001) has DEFINED but not built yet. It states plainly that the
 * screen is not built, names the master order that will build it, and lists the
 * intended scope — and fabricates no data, KPIs, records or operations.
 *
 * Navigation shows the full commerce-admin structure; this component keeps that
 * honest, so a defined space never masquerades as a working one.
 */
export function PlannedSpace({
  purpose,
  order,
  scope,
}: {
  purpose: string;
  order?: string;
  scope?: string[];
}) {
  return (
    <Card className="border-dashed">
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface-muted text-accent">
            <Icon name="sparkles" size={16} />
          </span>
          <p className="text-sm font-semibold">Espacio definido — aún no construido.</p>
        </div>

        <p className="max-w-2xl text-sm text-muted">{purpose}</p>

        {scope && scope.length > 0 ? (
          <div>
            <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-faint">
              Alcance previsto
            </p>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {scope.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-muted">
                  <Icon name="check" size={14} className="shrink-0 text-faint" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="text-xs text-faint">
          {order ? (
            <>
              Se construirá en la orden{" "}
              <span className="font-mono text-muted">{order}</span>.{" "}
            </>
          ) : null}
          Hasta entonces esta pantalla no muestra datos: no se inventan registros, métricas ni
          operaciones.
        </p>
      </div>
    </Card>
  );
}
