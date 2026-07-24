"use client";

import { useState } from "react";
import { Panel } from "@/components/ds";
import { localId } from "@/lib/local-collection";
import {
  publishTemplateVersion,
  transitionTemplate,
  type TemplateSnapshot,
  type TemplateState,
} from "@/lib/catalog-mirror";
import { useTemplates } from "@/lib/official-store-data";

/**
 * Plantillas versionadas del storefront (§16-§17): estructura copiada de la
 * tienda Shopify convertida a componentes propios (sin theme runtime). Ciclo
 * Draft → In review → Approved → Published → Superseded → Archived; publicar
 * jamás sobrescribe una versión publicada.
 */

const KINDS: TemplateSnapshot["templateKind"][] = [
  "home",
  "catalog",
  "collection",
  "product",
  "cart",
  "search",
  "account",
  "policies",
  "faq",
  "contact",
  "order-status",
];

const NEXT_ACTIONS: Partial<Record<TemplateState, { to: TemplateState; label: string }[]>> = {
  Draft: [
    { to: "In review", label: "Enviar a revisión" },
    { to: "Archived", label: "Archivar" },
  ],
  "In review": [
    { to: "Approved", label: "Aprobar" },
    { to: "Draft", label: "Devolver a borrador" },
  ],
  Approved: [{ to: "Archived", label: "Archivar" }],
  Published: [{ to: "Archived", label: "Archivar" }],
  Superseded: [{ to: "Archived", label: "Archivar" }],
};

export function TemplatesBoard() {
  const templates = useTemplates();
  const [kind, setKind] = useState<TemplateSnapshot["templateKind"]>("product");
  const [notice, setNotice] = useState<string | null>(null);

  const createDraft = () => {
    const now = new Date().toISOString();
    const versionNumber =
      templates.items.filter((t) => t.templateKind === kind).reduce((m, t) => Math.max(m, t.versionNumber), 0) + 1;
    templates.add({
      id: localId(),
      templateKind: kind,
      name: `Plantilla ${kind} v${versionNumber}`,
      structure: {
        sections: ["hero", "grid", "detail", "footer"],
        note: "Estructura propia derivada de la página equivalente de la tienda Shopify (sin theme runtime).",
      },
      sourceShopifyTemplate: `shopify:${kind}`,
      state: "Draft",
      versionNumber,
      createdAt: now,
    });
  };

  const doTransition = (t: TemplateSnapshot, to: TemplateState) => {
    setNotice(null);
    const now = new Date().toISOString();
    const next = transitionTemplate(t, to, now);
    if (!next) {
      setNotice(`Transición ilegal: ${t.state} → ${to}.`);
      return;
    }
    templates.update(t.id, next);
  };

  const publish = (t: TemplateSnapshot) => {
    setNotice(null);
    const out = publishTemplateVersion(templates.items, t.id, new Date().toISOString());
    if (!out) {
      setNotice("Solo se publica desde Approved.");
      return;
    }
    templates.replaceAll(out);
  };

  return (
    <div className="flex flex-col gap-6">
      {notice ? <p className="rounded-lg border border-warn/50 bg-warn/10 px-4 py-2 text-sm text-warn">{notice}</p> : null}
      <Panel icon="file" title="Nueva versión de plantilla">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as TemplateSnapshot["templateKind"])}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <button onClick={createDraft} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Crear borrador
          </button>
          <span className="text-xs text-muted">Cada versión nace en Draft y sube por revisión y aprobación.</span>
        </div>
      </Panel>

      <Panel icon="layers" title={`Versiones (${templates.items.length})`}>
        {templates.items.length === 0 ? (
          <p className="text-sm text-muted">Sin plantillas versionadas todavía.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {[...templates.items]
              .sort((a, b) => (a.templateKind + a.versionNumber < b.templateKind + b.versionNumber ? -1 : 1))
              .map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-muted/30 px-4 py-2.5"
                >
                  <div>
                    <span className="text-sm font-medium">{t.name}</span>
                    <span className="ml-2 text-xs text-faint">
                      {t.templateKind} · v{t.versionNumber}
                      {t.supersededBy ? " · sustituida" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[0.7rem] ${
                        t.state === "Published"
                          ? "bg-ok/15 text-ok"
                          : t.state === "Archived" || t.state === "Superseded"
                            ? "bg-surface-muted text-faint"
                            : "bg-info/15 text-info"
                      }`}
                    >
                      {t.state}
                    </span>
                    {(NEXT_ACTIONS[t.state] ?? []).map((a) => (
                      <button
                        key={a.to}
                        onClick={() => doTransition(t, a.to)}
                        className="rounded-lg border border-border px-2.5 py-1 text-xs hover:border-accent"
                      >
                        {a.label}
                      </button>
                    ))}
                    {t.state === "Approved" ? (
                      <button
                        onClick={() => publish(t)}
                        className="rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
                      >
                        Publicar
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
