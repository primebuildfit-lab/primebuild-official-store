"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, HonestState, SegmentedControl, StatusDot, type TabOption } from "@/components/ds";
import { useVersionedCollection } from "@/lib/local-collection";
import {
  STORE_DEF_SCHEMA_VERSION,
  isStoreDefinition,
  type StoreDefinition,
  type StoreRevision,
} from "@/lib/store-definition";
import {
  PUBLISH_AUTHORIZED_THIS_PHASE,
  VERSION_TRANSITIONS,
  canPrepareVersion,
  runValidation,
  versionStatusLabel,
  type VersionStatus,
} from "@/lib/publishing";

/**
 * Preview y publicación (PBOS-001 · ORDEN 18). Consumes the ONE StoreDefinition —
 * no duplicate. Every local preview is labelled "Vista previa local — no
 * publicada". Versions move through distinct states; Validado is not Published,
 * Autorizado is not deployed. The final publish action is blocked this phase.
 */

const isRevision = (x: unknown): x is StoreRevision =>
  x !== null && typeof x === "object" && typeof (x as StoreRevision).id === "string";

const DEVICES: TabOption[] = [
  { value: "desktop", label: "Escritorio" },
  { value: "tablet", label: "Tablet" },
  { value: "phone", label: "Teléfono" },
];

const DEVICE_WIDTH: Record<string, string> = { desktop: "100%", tablet: "48rem", phone: "22rem" };

export function PublishingBoard({
  connected,
  variant,
}: {
  connected: boolean;
  variant: "preview" | "publish";
}) {
  const store = useVersionedCollection<StoreDefinition>(
    "store:definition",
    STORE_DEF_SCHEMA_VERSION,
    isStoreDefinition,
  );
  const revisions = useVersionedCollection<StoreRevision>(
    "store:revisions",
    STORE_DEF_SCHEMA_VERSION,
    isRevision,
  );
  const [device, setDevice] = useState("desktop");

  const def = store.items[0] ?? null;
  const checks = useMemo(() => (def ? runValidation(def, { connected }) : []), [def, connected]);
  const preparable = canPrepareVersion(checks);

  function advance(rev: StoreRevision, to: VersionStatus) {
    revisions.update(rev.id, { status: to });
  }

  return (
    <div className="flex flex-col gap-6">
      {variant === "preview" ? (
        <section>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <SegmentedControl options={DEVICES} value={device} onChange={setDevice} />
            <Badge kind="warning">Vista previa local — no publicada</Badge>
          </div>
          {!def ||
          (def.pages.length === 0 && def.homeBlocks.length === 0 && def.nav.length === 0) ? (
            <HonestState
              icon="eye"
              title="Vista previa vacía."
              description={
                <>
                  No hay una StoreDefinition con contenido todavía.{" "}
                  <Link href="/online/design" className="text-accent hover:underline">
                    Ir a Diseño visual
                  </Link>
                  .
                </>
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-surface/40 p-4">
              <div
                className="mx-auto rounded-lg border border-border bg-background p-4"
                style={{ maxWidth: DEVICE_WIDTH[device] }}
              >
                <p className="text-sm font-bold">{def.identity.name || "(sin nombre)"}</p>
                {def.identity.tagline ? (
                  <p className="text-xs text-muted">{def.identity.tagline}</p>
                ) : null}
                {def.nav.length > 0 ? (
                  <nav className="mt-2 flex flex-wrap gap-2 text-xs text-accent">
                    {def.nav.map((n) => (
                      <span key={n.id}>{n.label}</span>
                    ))}
                  </nav>
                ) : null}
                <div className="mt-3 flex flex-col gap-1.5">
                  {def.homeBlocks.map((b) => (
                    <div
                      key={b.id}
                      className="rounded border border-dashed border-border px-2 py-3 text-center text-[0.7rem] uppercase tracking-wide text-faint"
                    >
                      bloque · {b.type}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <p className="mt-2 text-[0.68rem] text-faint">
            Usa la misma StoreDefinition. No representa la tienda pública. Si se usaran estados
            simulados para revisar layouts, se marcarían: &quot;Modo Preview — estado simulado, no
            representa datos reales.&quot;
          </p>
        </section>
      ) : null}

      {/* Validation */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted">Validación</h2>
        {checks.length === 0 ? (
          <p className="text-xs text-faint">Cargando definición…</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {checks.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-sm"
              >
                <StatusDot tone={c.ok ? "ok" : c.severity === "error" ? "err" : "warn"} />
                <span className={c.ok ? "" : c.severity === "error" ? "text-err" : "text-warn"}>
                  {c.label}
                </span>
                {c.note ? (
                  <span className="ml-auto text-[0.68rem] text-faint">{c.note}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[0.68rem] text-faint">
          {preparable
            ? "Sin errores: se puede preparar una versión."
            : "Hay errores: resuélvelos antes de preparar."}
        </p>
      </section>

      {/* Versions */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted">Versiones</h2>
        {revisions.items.length === 0 ? (
          <HonestState
            icon="eye"
            title="Sin versiones preparadas."
            description="Guarda la definición en Diseño visual para crear una versión."
          />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {revisions.items
              .slice()
              .reverse()
              .map((r) => {
                const next = VERSION_TRANSITIONS[r.status].filter((s) => s !== "publicado");
                return (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <span className="font-mono text-xs">#{r.number}</span>
                    <Badge kind="neutral">{versionStatusLabel(r.status)}</Badge>
                    <span className="text-xs text-faint">
                      {new Date(r.at).toLocaleString("es")}
                    </span>
                    <div className="ml-auto flex flex-wrap items-center gap-1.5">
                      {next.map((s) => {
                        const disabled = s === "preparado" && !preparable;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => advance(r, s)}
                            disabled={disabled}
                            title={disabled ? "Resuelve los errores de validación" : undefined}
                            className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {versionStatusLabel(s)}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        disabled={!PUBLISH_AUTHORIZED_THIS_PHASE}
                        title="Publicación no autorizada en esta fase"
                        className="cursor-not-allowed rounded-lg border border-border px-2.5 py-1 text-xs text-faint opacity-60"
                      >
                        Publicar
                      </button>
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
        <p className="mt-2 text-[0.68rem] text-faint">
          Validado ≠ Publicado · Preparado ≠ Autorizado · Autorizado ≠ desplegado · Preview ≠ tienda
          pública. La publicación está bloqueada en esta fase.
        </p>
      </section>

      {variant === "publish" ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface/50 px-3 py-2 text-sm">
          <StatusDot tone="warn" />
          <span className="font-medium">Publicación no autorizada en esta fase.</span>
          <span className="text-faint">
            Preparar y autorizar es local; publicar/sincronizar está bloqueado.
          </span>
        </div>
      ) : null}
    </div>
  );
}
