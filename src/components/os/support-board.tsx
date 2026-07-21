"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, HonestState, Icon, SegmentedControl, type TabOption } from "@/components/ds";
import { useVersionedCollection, localId } from "@/lib/local-collection";
import {
  SUPPORT_LINKS,
  SUPPORT_SCHEMA_VERSION,
  isSupportTicket,
  safeDiagnostic,
  validateTicket,
  type SupportTicket,
} from "@/lib/support";

/**
 * Soporte (PBOS-001 · ORDEN 29). The single, last entry. No ticket backend, so
 * tickets/agents/SLA are never invented and nothing is sent — a request is only
 * prepared or exported locally. Safe diagnostics declare inclusions/exclusions and
 * carry no secrets or unneeded personal data. Contextual help links to real routes.
 */

const TABS: TabOption[] = [
  { value: "ayuda", label: "Ayuda contextual" },
  { value: "guias", label: "Guías" },
  { value: "diagnostico", label: "Diagnóstico" },
  { value: "incidencias", label: "Incidencias conocidas" },
  { value: "tickets", label: "Tickets" },
  { value: "actividad", label: "Actividad de soporte" },
];

export function SupportBoard({ version }: { version: string }) {
  const [tab, setTab] = useState("ayuda");
  const tickets = useVersionedCollection<SupportTicket>(
    "support:tickets",
    SUPPORT_SCHEMA_VERSION,
    isSupportTicket,
  );
  const diag = safeDiagnostic(version);

  return (
    <div>
      <SegmentedControl options={TABS} value={tab} onChange={setTab} className="mb-4 flex-wrap" />

      {tab === "ayuda" || tab === "guias" ? (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {SUPPORT_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3 text-sm transition-colors hover:border-border-strong"
            >
              <Icon name="chevron-right" size={14} className="text-faint" />
              {l.label}
            </Link>
          ))}
          {tab === "guias" ? (
            <p className="col-span-full text-xs text-faint">
              Sin backend de guías: los enlaces apuntan a rutas reales del panel.
            </p>
          ) : null}
        </div>
      ) : null}

      {tab === "diagnostico" ? (
        <div className="rounded-xl border border-border bg-surface/50 p-4 text-sm">
          <p className="mb-2 font-semibold">Diagnóstico seguro</p>
          <p className="text-xs text-muted">Incluye:</p>
          <ul className="mb-2 ml-4 list-disc text-xs text-muted">
            {diag.included.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className="text-xs text-muted">Excluye:</p>
          <ul className="ml-4 list-disc text-xs text-muted">
            {diag.excluded.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className="mt-2 text-[0.66rem] text-faint">
            Sin secretos ni datos personales innecesarios. Se adjunta solo con consentimiento
            explícito al preparar un ticket.
          </p>
        </div>
      ) : null}

      {tab === "incidencias" ? (
        <HonestState
          icon="alert"
          title="Sin incidencias conocidas registradas."
          description="Requiere un backend de incidencias; no se inventan."
        />
      ) : null}

      {tab === "tickets" ? <TicketForm version={version} onCreate={(t) => tickets.add(t)} /> : null}

      {tab === "actividad" ? (
        tickets.items.length === 0 ? (
          <HonestState
            icon="activity"
            title="Sin actividad de soporte."
            description="Los tickets preparados localmente aparecerán aquí. No hay envío real: sistema de tickets no conectado."
          />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {tickets.items
              .slice()
              .reverse()
              .map((t) => (
                <li key={t.id} className="rounded-xl border border-border/60 px-3 py-2 text-sm">
                  <span className="font-medium">{t.subject}</span> ·{" "}
                  <Badge kind="neutral">{t.severity}</Badge>{" "}
                  <span className="text-xs text-faint">
                    {new Date(t.createdAt).toLocaleString("es")} · {t.status}
                  </span>
                </li>
              ))}
          </ul>
        )
      ) : null}
    </div>
  );
}

function TicketForm({
  version,
  onCreate,
}: {
  version: string;
  onCreate: (t: SupportTicket) => void;
}) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [severity, setSeverity] = useState<SupportTicket["severity"]>("media");
  const [description, setDescription] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState("/control/support");

  function build(): SupportTicket | null {
    const parsed = validateTicket({ subject, description });
    if (!parsed.ok) {
      setError(parsed.error ?? "No válido.");
      return null;
    }
    setError(null);
    return {
      id: localId(),
      subject: subject.trim(),
      category,
      severity,
      description: description.trim(),
      route,
      version,
      status: "borrador",
      includeDiagnostic: consent,
      createdAt: new Date().toISOString(),
    };
  }

  function prepare() {
    const t = build();
    if (t) {
      onCreate(t);
      setSubject("");
      setDescription("");
      setConsent(false);
    }
  }

  function exportTicket() {
    const t = build();
    if (!t) return;
    const blob = new Blob([JSON.stringify(t, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ticket-${t.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-xl border border-border bg-surface/50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <p className="text-sm font-semibold">Preparar solicitud</p>
        <Badge kind="warning">Sistema de tickets no conectado</Badge>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Asunto"
          className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none"
        />
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Categoría"
          className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none"
        />
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as SupportTicket["severity"])}
          className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none"
        >
          <option value="baja">baja</option>
          <option value="media">media</option>
          <option value="alta">alta</option>
        </select>
        <input
          value={route}
          onChange={(e) => setRoute(e.target.value)}
          placeholder="Ruta"
          className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none"
        />
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder="Descripción"
        className="mt-2 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none"
      />
      <label className="mt-2 flex items-center gap-2 text-xs text-muted">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        Adjuntar diagnóstico seguro (sin secretos ni datos personales)
      </label>
      {error ? <p className="mt-1 text-xs text-warn">{error}</p> : null}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={prepare}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
        >
          Preparar (local)
        </button>
        <button
          type="button"
          onClick={exportTicket}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground"
        >
          Exportar
        </button>
        <span className="text-[0.66rem] text-faint">
          No se envía nada: preparar/exportar es local.
        </span>
      </div>
    </div>
  );
}
