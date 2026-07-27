"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon, SegmentedControl, StatusBadge, type TabOption } from "@/components/ds";

/**
 * The Official Store task center (PBOS-001 · ORDEN 2). It covers ONLY Official
 * Store operational work (purchases, receiving, inventory, suppliers, products,
 * orders, returns, Shopify, publishing, integrations, support) — never the
 * company-wide priorities that live in PrimeBuild Internal OS.
 *
 * There is no task store yet, so the default collection is empty. It never
 * invents tasks, dates or assignees: each view shows an honest empty state and
 * the board only ever renders real items the app supplies.
 */

export type OfficialTaskType =
  | "compra"
  | "recepción"
  | "inventario"
  | "proveedor"
  | "producto"
  | "pedido"
  | "devolución"
  | "shopify"
  | "publicación"
  | "integración"
  | "soporte";

export type OfficialTaskStatus =
  "pendiente" | "en-progreso" | "bloqueada" | "vencida" | "completada";

export interface OfficialTask {
  id: string;
  title: string;
  type: OfficialTaskType;
  status: OfficialTaskStatus;
  priority?: "baja" | "media" | "alta";
  assignee?: string;
  /** Pre-formatted due date, with a visible timezone. */
  due?: string;
  /** The real event/origin that created the task (esp. automatic ones). */
  source?: string;
  /** Link + label to the related Official Store entity. */
  entityHref?: string;
  entityLabel?: string;
  automatic?: boolean;
}

const VIEWS: TabOption[] = [
  { value: "mine", label: "Mi trabajo" },
  { value: "team", label: "Equipo" },
  { value: "calendar", label: "Calendario" },
  { value: "due", label: "Vencidas" },
  { value: "blocked", label: "Bloqueadas" },
  { value: "auto", label: "Automáticas" },
  { value: "done", label: "Completadas" },
];

const EMPTY_NOTE: Record<string, string> = {
  mine: "Tus tareas de Official Store aparecerán aquí cuando existan.",
  team: "Las tareas del equipo de comercio y almacén aparecerán aquí.",
  calendar: "Las tareas con fecha se mostrarán en el calendario cuando existan.",
  due: "No hay tareas vencidas.",
  blocked: "No hay tareas bloqueadas.",
  auto: "Las tareas automáticas enlazarán al evento real que las creó.",
  done: "Aún no hay tareas completadas.",
};

const STATUS_TONE: Record<OfficialTaskStatus, Parameters<typeof StatusBadge>[0]["tone"]> = {
  pendiente: "neutral",
  "en-progreso": "progress",
  bloqueada: "warning",
  vencida: "critical",
  completada: "positive",
};

function filterView(tasks: OfficialTask[], view: string): OfficialTask[] {
  switch (view) {
    case "due":
      return tasks.filter((t) => t.status === "vencida");
    case "blocked":
      return tasks.filter((t) => t.status === "bloqueada");
    case "auto":
      return tasks.filter((t) => t.automatic);
    case "done":
      return tasks.filter((t) => t.status === "completada");
    default:
      return tasks.filter((t) => t.status !== "completada");
  }
}

export function TasksBoard({ tasks = [] }: { tasks?: OfficialTask[] }) {
  const [view, setView] = useState("mine");
  const list = filterView(tasks, view);

  return (
    <div>
      <SegmentedControl
        options={VIEWS}
        value={view}
        onChange={setView}
        className="mb-4 flex-wrap"
      />

      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface/40 p-10 text-center">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface-muted text-faint">
            <Icon name="check" size={18} />
          </span>
          <p className="text-sm font-medium text-muted">Sin tareas en esta vista.</p>
          <p className="max-w-md text-xs text-faint">{EMPTY_NOTE[view]}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((t) => (
            <li
              key={t.id}
              className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{t.title}</p>
                  <StatusBadge label={t.status} tone={STATUS_TONE[t.status]} />
                  {t.automatic ? (
                    <span className="text-[0.6rem] uppercase tracking-wide text-faint">
                      automática
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[0.68rem] text-faint">
                  <span>Tipo: {t.type}</span>
                  {t.assignee ? <span>· {t.assignee}</span> : null}
                  {t.due ? <span>· Vence: {t.due}</span> : null}
                  {t.source ? <span>· Origen: {t.source}</span> : null}
                </div>
                {t.entityHref && t.entityLabel ? (
                  <Link
                    href={t.entityHref}
                    className="mt-1 inline-flex items-center gap-0.5 text-xs text-accent hover:underline"
                  >
                    {t.entityLabel}
                    <Icon name="chevron-right" size={12} />
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
