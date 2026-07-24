"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, HonestState } from "@/components/ds";
import { useVersionedCollection, localId } from "@/lib/local-collection";
import {
  PENDING_DECISIONS,
  SETTINGS_SCHEMA_VERSION,
  diffSettings,
  isSettingsRevision,
  validateOperatorSettings,
  type OperatorSettings,
  type SettingsRevision,
} from "@/lib/settings";

/**
 * Configuración (PBOS-001 · ORDEN 28). Only Official Store's own settings. The
 * operator settings are persistent, validated, versioned, audited and reversible
 * (each save creates a revision with a diff; restoring creates a new revision, it
 * never deletes). Business decisions are listed as pending, never invented.
 * Identifier, keys, updater and channel are shown as observed and not changed
 * here.
 */

const SECTIONS: { value: string; label: string }[] = [
  { value: "general", label: "General" },
  { value: "organizacion", label: "Organización operativa" },
  { value: "productos", label: "Productos" },
  { value: "compras", label: "Compras" },
  { value: "proveedores", label: "Proveedores" },
  { value: "inventario", label: "Inventario" },
  { value: "almacenes", label: "Almacenes" },
  { value: "pedidos", label: "Pedidos" },
  { value: "fulfillment", label: "Fulfillment" },
  { value: "devoluciones", label: "Devoluciones" },
  { value: "shopify", label: "Shopify" },
  { value: "publicacion", label: "Publicación" },
  { value: "metricas", label: "Métricas" },
  { value: "reglas", label: "Reglas" },
  { value: "notificaciones", label: "Notificaciones" },
  { value: "permisos", label: "Permisos funcionales" },
  { value: "datos", label: "Datos y retención" },
  { value: "importacion", label: "Importación y exportación" },
  { value: "escritorio", label: "Aplicación de escritorio" },
  { value: "updater", label: "Updater observado" },
  { value: "diagnostico", label: "Diagnóstico" },
  { value: "decisiones", label: "Decisiones pendientes" },
];

const PENDING_POLICY: Record<string, string> = {
  inventario:
    "Fórmula de disponibilidad (Available/Available-to-sell) no definida: requiere decisión del propietario.",
  pedidos: "Política de reserva no definida: no se reserva automáticamente.",
  devoluciones: "Reglas de devolución no definidas: sin destino por categoría por defecto.",
  publicacion: "Publicación no autorizada en esta fase.",
};

export function SettingsHub({
  diagnostics,
}: {
  diagnostics: {
    version: string;
    identifier: string;
    channel: string;
    shopifyConnected: boolean;
    schemas: { name: string; v: number }[];
  };
}) {
  const [section, setSection] = useState("general");

  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
      <nav className="flex max-h-[70vh] flex-col gap-0.5 overflow-y-auto rounded-xl border border-border bg-surface/50 p-2">
        {SECTIONS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setSection(s.value)}
            className={`rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${section === s.value ? "bg-surface-muted text-foreground" : "text-muted hover:text-foreground"}`}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <div>
        {section === "general" || section === "organizacion" ? <OperatorSettingsEditor /> : null}
        {section === "datos" ? <DataRetention /> : null}
        {section === "diagnostico" ? <Diagnostics d={diagnostics} /> : null}
        {section === "decisiones" ? <PendingDecisions /> : null}
        {section === "escritorio" ? (
          <Observed
            title="Aplicación de escritorio"
            rows={[
              ["Identifier", diagnostics.identifier],
              ["Versión", diagnostics.version],
            ]}
            note="Valores observados. Identifier, productName y claves no se cambian aquí."
          />
        ) : null}
        {section === "updater" ? (
          <Observed
            title="Updater observado"
            rows={[["Canal", diagnostics.channel]]}
            note="Canal observado, de solo lectura. No se cambia el canal ni las claves aquí; sin migraciones live."
          />
        ) : null}
        {section === "shopify" ? (
          <HonestState
            icon="store"
            title={
              diagnostics.shopifyConnected
                ? "Shopify conectado (solo lectura)"
                : "Shopify no conectado"
            }
            description={
              <>
                La configuración de Shopify vive en su centro dedicado.{" "}
                <Link href="/store" className="text-accent hover:underline">
                  Abrir Shopify
                </Link>
                . No se cambian identifier ni claves aquí.
              </>
            }
          />
        ) : null}
        {PENDING_POLICY[section] ? (
          <HonestState
            icon="alert"
            tone="warn"
            title="Política no definida."
            description={PENDING_POLICY[section]}
          />
        ) : null}
        {[
          "productos",
          "compras",
          "proveedores",
          "almacenes",
          "fulfillment",
          "metricas",
          "reglas",
          "notificaciones",
          "permisos",
          "importacion",
        ].includes(section) ? (
          <HonestState
            icon="settings"
            title="Pendiente de configuración."
            description="Esta sección no tiene valores por defecto inventados; se configurará cuando exista la decisión o la fuente."
          />
        ) : null}
      </div>
    </div>
  );
}

function OperatorSettingsEditor() {
  const settings = useVersionedCollection<OperatorSettings>(
    "settings:operator",
    SETTINGS_SCHEMA_VERSION,
    (x): x is OperatorSettings =>
      x !== null && typeof x === "object" && "displayLabel" in (x as object),
  );
  const revisions = useVersionedCollection<SettingsRevision>(
    "settings:revisions",
    SETTINGS_SCHEMA_VERSION,
    isSettingsRevision,
  );
  const current = settings.items[0] ?? null;
  const [label, setLabel] = useState(current?.displayLabel ?? "");
  const [error, setError] = useState<string | null>(null);

  function save() {
    const parsed = validateOperatorSettings({ displayLabel: label });
    if (!parsed.ok) return setError(parsed.error ?? "No válido.");
    const before = current;
    const after: OperatorSettings = {
      id: current?.id ?? "singleton",
      displayLabel: label.trim(),
      timezoneLabel: current?.timezoneLabel ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      updatedAt: new Date().toISOString(),
    };
    if (current) settings.update(current.id, after);
    else settings.add(after);
    revisions.add({
      id: localId(),
      number: revisions.items.length + 1,
      at: new Date().toISOString(),
      actor: "operador-local",
      reason: "Actualización de configuración",
      before,
      after,
    });
    setError(null);
  }

  function restore(rev: SettingsRevision) {
    const after: OperatorSettings = { ...rev.after, updatedAt: new Date().toISOString() };
    if (current) settings.update(current.id, after);
    else settings.add(after);
    setLabel(after.displayLabel);
    // Restoring creates a NEW revision; it never deletes the replaced one.
    revisions.add({
      id: localId(),
      number: revisions.items.length + 1,
      at: new Date().toISOString(),
      actor: "operador-local",
      reason: `Restaurar revisión #${rev.number}`,
      before: current,
      after,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-surface/50 p-4">
        <p className="mb-2 text-sm font-semibold">
          Configuración general <Badge kind="neutral">Local · versionada</Badge>
        </p>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Etiqueta operativa
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="p. ej. Comercio PrimeBuild"
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none"
          />
        </label>
        {error ? <p className="mt-1 text-xs text-warn">{error}</p> : null}
        <button
          type="button"
          onClick={save}
          className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
        >
          Guardar (crea revisión)
        </button>
        <p className="mt-1 text-[0.66rem] text-faint">
          Persistente, validada, versionada y auditada. Restaurar crea una revisión nueva; no borra
          la reemplazada.
        </p>
      </div>

      <div>
        <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-faint">
          Revisiones
        </p>
        {revisions.items.length === 0 ? (
          <p className="text-xs text-faint">Sin revisiones todavía.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {revisions.items
              .slice()
              .reverse()
              .map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-xs"
                >
                  <span>
                    #{r.number} · {new Date(r.at).toLocaleString("es")} ·{" "}
                    {diffSettings(r.before, r.after).join("; ")}
                  </span>
                  <button
                    type="button"
                    onClick={() => restore(r)}
                    className="text-accent hover:underline"
                  >
                    Restaurar
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DataRetention() {
  const keys =
    typeof window !== "undefined"
      ? Object.keys(window.localStorage).filter((k) => k.startsWith("pbos:local:"))
      : [];
  return (
    <div className="rounded-xl border border-border bg-surface/50 p-4">
      <p className="mb-2 text-sm font-semibold">
        Datos y retención <Badge kind="neutral">Local</Badge>
      </p>
      {keys.length === 0 ? (
        <p className="text-xs text-faint">Sin colecciones locales guardadas.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-xs text-muted">
          {keys.map((k) => (
            <li key={k} className="font-mono">
              {k.replace("pbos:local:", "")}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[0.66rem] text-faint">
        Datos locales de este equipo (workspace). No es producción, ni compartido, ni Shopify. Sin
        secretos.
      </p>
    </div>
  );
}

function Diagnostics({
  d,
}: {
  d: {
    version: string;
    identifier: string;
    channel: string;
    shopifyConnected: boolean;
    schemas: { name: string; v: number }[];
  };
}) {
  return (
    <div className="rounded-xl border border-border bg-surface/50 p-4 text-sm">
      <p className="mb-2 font-semibold">Diagnóstico</p>
      <dl className="grid grid-cols-1 gap-1.5">
        <D k="Versión" v={d.version} />
        <D k="Identifier" v={d.identifier} />
        <D k="Canal (observado)" v={d.channel} />
        <D k="Almacenamiento" v="localStorage (Local)" />
        <D k="Shopify" v={d.shopifyConnected ? "conectado (solo lectura)" : "no conectado"} />
        <D k="Esquemas locales" v={d.schemas.map((s) => `${s.name}:v${s.v}`).join("  ·  ")} />
      </dl>
      <p className="mt-2 text-[0.66rem] text-faint">
        Exportación de diagnóstico sin secretos. No se cambian identifier, claves, updater ni canal;
        sin migraciones live.
      </p>
    </div>
  );
}

function PendingDecisions() {
  return (
    <div className="rounded-xl border border-border bg-surface/50 p-4">
      <p className="mb-2 text-sm font-semibold">Decisiones pendientes del propietario</p>
      <ul className="flex flex-col gap-1.5">
        {PENDING_DECISIONS.map((d) => (
          <li
            key={d.name}
            className="flex items-start justify-between gap-3 border-b border-border/50 py-1.5 text-sm last:border-0"
          >
            <span className="font-medium">{d.name}</span>
            <span className="text-right text-xs text-muted">{d.reason}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[0.66rem] text-faint">
        No se inventan: cada una espera la decisión del propietario.
      </p>
    </div>
  );
}

function Observed({
  title,
  rows,
  note,
}: {
  title: string;
  rows: [string, string][];
  note: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface/50 p-4 text-sm">
      <p className="mb-2 font-semibold">{title}</p>
      <dl className="grid grid-cols-1 gap-1.5">
        {rows.map(([k, v]) => (
          <D key={k} k={k} v={v} />
        ))}
      </dl>
      <p className="mt-2 text-[0.66rem] text-faint">{note}</p>
    </div>
  );
}

function D({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/50 py-1 last:border-0">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-mono text-xs">{v}</dd>
    </div>
  );
}
