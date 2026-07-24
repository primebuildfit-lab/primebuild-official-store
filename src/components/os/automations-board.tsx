"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  DataTable,
  DetailDrawer,
  HonestState,
  SegmentedControl,
  type Column,
  type TabOption,
} from "@/components/ds";
import { useVersionedCollection, localId } from "@/lib/local-collection";
import {
  AUTOMATIONS_SCHEMA_VERSION,
  PROTECTED_ACTIONS,
  SAFE_ACTIONS,
  isProtectedAction,
  isRule,
  ruleStatusLabel,
  testRule,
  type Rule,
  type RuleStatus,
} from "@/lib/automations";

/**
 * Reglas y automatizaciones (PBOS-001 · ORDEN 26). Explainable, deterministic
 * rules (never "IA"). Protected actions never execute without authorization; test
 * mode evaluates without modifying anything; pausing keeps history.
 */

const VIEWS: TabOption[] = [
  { value: "activa", label: "Activas" },
  { value: "borrador", label: "Borradores" },
  { value: "pausada", label: "Pausadas" },
  { value: "error", label: "Con errores" },
  { value: "historial", label: "Historial" },
  { value: "plantillas", label: "Plantillas" },
];

const ALL_ACTIONS = [...SAFE_ACTIONS, ...PROTECTED_ACTIONS];

export function AutomationsBoard() {
  const rules = useVersionedCollection<Rule>(
    "automations:rules",
    AUTOMATIONS_SCHEMA_VERSION,
    isRule,
  );
  const [view, setView] = useState("activa");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("");
  const [condition, setCondition] = useState("");
  const [action, setAction] = useState<string>(SAFE_ACTIONS[0]);

  const selected = rules.items.find((r) => r.id === selectedId) ?? null;

  function create() {
    if (!name.trim() || !trigger.trim()) return;
    rules.add({
      id: localId(),
      name: name.trim(),
      status: "borrador",
      trigger: trigger.trim(),
      conditions: condition.trim() ? [condition.trim()] : [],
      actions: [action],
      scope: "official-store",
      environment: "local",
      owner: "operador-local",
      version: 1,
      history: [{ at: new Date().toISOString(), actor: "operador-local", action: "Regla creada" }],
    });
    setName("");
    setTrigger("");
    setCondition("");
  }

  const rows = useMemo(
    () =>
      ["historial", "plantillas"].includes(view)
        ? []
        : rules.items.filter((r) => r.status === view),
    [rules.items, view],
  );

  const columns: Column<Rule>[] = [
    { key: "name", header: "Regla", render: (r) => <span className="font-medium">{r.name}</span> },
    {
      key: "trigger",
      header: "Disparador",
      render: (r) => <span className="text-muted">{r.trigger}</span>,
    },
    { key: "actions", header: "Acciones", render: (r) => r.actions.join(", ") },
    {
      key: "status",
      header: "Estado",
      render: (r) => <Badge kind="neutral">{ruleStatusLabel(r.status)}</Badge>,
    },
    {
      key: "open",
      header: "",
      align: "right",
      render: (r) => (
        <button
          type="button"
          onClick={() => setSelectedId(r.id)}
          className="text-xs text-muted hover:text-foreground"
        >
          Abrir
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-border bg-surface/50 p-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la regla"
          className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none"
        />
        <input
          value={trigger}
          onChange={(e) => setTrigger(e.target.value)}
          placeholder="Disparador"
          className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none"
        />
        <input
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          placeholder="Condición (campo)"
          className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none"
        />
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none"
        >
          {ALL_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
              {isProtectedAction(a) ? " (protegida)" : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={create}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Crear regla
        </button>
        <span className="ml-auto text-[0.68rem] text-faint">
          Regla determinista, no &quot;IA&quot;
        </span>
      </div>

      <SegmentedControl
        options={VIEWS}
        value={view}
        onChange={setView}
        className="mb-4 flex-wrap"
      />

      {view === "plantillas" ? (
        <HonestState
          icon="sparkles"
          title="Sin plantillas."
          description="Las plantillas de regla aparecerán aquí; no se inventan."
        />
      ) : view === "historial" ? (
        rules.items.flatMap((r) => r.history).length === 0 ? (
          <HonestState
            icon="activity"
            title="Sin historial."
            description="El historial registra ejecuciones y cambios reales."
          />
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {rules.items.flatMap((r) =>
              r.history.map((h, i) => (
                <li
                  key={r.id + i}
                  className="rounded-lg border border-border/60 px-3 py-1.5 text-xs"
                >
                  <span className="font-medium">{r.name}</span> ·{" "}
                  {new Date(h.at).toLocaleString("es")} · {h.action}
                </li>
              )),
            )}
          </ul>
        )
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getKey={(r) => r.id}
          emptyMessage="Sin reglas en esta vista."
        />
      )}

      {selected ? (
        <RuleDrawer
          key={selected.id}
          rule={selected}
          onClose={() => setSelectedId(null)}
          onChange={(patch) => rules.update(selected.id, patch)}
        />
      ) : null}
    </div>
  );
}

function RuleDrawer({
  rule,
  onClose,
  onChange,
}: {
  rule: Rule;
  onClose: () => void;
  onChange: (patch: Partial<Rule>) => void;
}) {
  const [test, setTest] = useState<ReturnType<typeof testRule> | null>(null);

  function toggleStatus(next: RuleStatus) {
    onChange({
      status: next,
      history: [
        ...rule.history,
        { at: new Date().toISOString(), actor: "operador-local", action: `Estado → ${next}` },
      ],
    });
  }

  return (
    <DetailDrawer
      open
      onClose={onClose}
      title={rule.name}
      description={`Disparador: ${rule.trigger}`}
    >
      <div className="flex flex-col gap-5">
        <section className="grid grid-cols-2 gap-2 text-sm">
          <F label="Estado" value={ruleStatusLabel(rule.status)} />
          <F label="Alcance" value={rule.scope} />
          <F label="Entorno" value={rule.environment} />
          <F label="Versión" value={String(rule.version)} />
          <F label="Condiciones" value={rule.conditions.join(", ") || "—"} />
          <F
            label="Última ejecución"
            value={rule.lastRun ? new Date(rule.lastRun).toLocaleString("es") : "—"}
          />
        </section>

        <section>
          <p className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-faint">
            Acciones
          </p>
          <div className="flex flex-wrap gap-1.5">
            {rule.actions.map((a) => (
              <Badge key={a} kind={isProtectedAction(a) ? "critical" : "neutral"}>
                {a}
                {isProtectedAction(a) ? " · bloqueada" : ""}
              </Badge>
            ))}
          </div>
          <p className="mt-1 text-[0.66rem] text-faint">
            Las acciones protegidas nunca se ejecutan sin autorización adecuada.
          </p>
        </section>

        <section className="rounded-lg border border-border bg-surface/50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-faint">
              Modo prueba
            </p>
            <button
              type="button"
              onClick={() => setTest(testRule(rule, {}))}
              className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted hover:text-foreground"
            >
              Probar (sin ejecutar)
            </button>
          </div>
          {test ? (
            <div className="text-xs text-muted">
              <p>
                Condiciones:{" "}
                {test.conditionsEvaluated
                  .map((c) => `${c.condition}=${c.met ? "sí" : "no"}`)
                  .join(", ") || "—"}
              </p>
              <p>Datos faltantes: {test.missing.join(", ") || "—"}</p>
              <p>Acciones propuestas: {test.proposedActions.join(", ") || "—"}</p>
              <p className="text-warn">
                Acciones bloqueadas: {test.blockedActions.join(", ") || "—"}
              </p>
              <p className="mt-1 text-faint">No modifica ninguna entidad. Ejecutado: no.</p>
            </div>
          ) : (
            <p className="text-xs text-faint">
              Ejecuta una prueba contra una entidad real sin modificarla.
            </p>
          )}
        </section>

        <section className="flex flex-wrap gap-2">
          {rule.status !== "activa" ? (
            <button
              type="button"
              onClick={() => toggleStatus("activa")}
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground"
            >
              Activar
            </button>
          ) : null}
          {rule.status !== "pausada" ? (
            <button
              type="button"
              onClick={() => toggleStatus("pausada")}
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground"
            >
              Pausar
            </button>
          ) : null}
        </section>
        <p className="text-[0.66rem] text-faint">
          Pausar no borra el historial. Los reintentos son idempotentes.
        </p>
      </div>
    </DetailDrawer>
  );
}

function F({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-2.5 py-1.5">
      <p className="text-[0.62rem] uppercase tracking-wide text-faint">{label}</p>
      <p className="mt-0.5">{value}</p>
    </div>
  );
}
