"use client";

import Link from "next/link";
import { Panel } from "@/components/ds";
import { FEATURE_FLAGS } from "@/config/feature-flags";
import { STORE_ROLES } from "@/config/store-permissions";
import { useStorefrontCatalog, useStoreEvents } from "@/lib/official-store-data";

/**
 * Estado del storefront propio (§10, §42, §54): regla de visibilidad, recuento
 * visible/oculto, feature flags con sus puertas y eventos recientes. El Client
 * (/shop) no tiene autoridad de configuración: todo se decide aquí.
 */
export function StorefrontStatus() {
  const catalog = useStorefrontCatalog();
  const { events } = useStoreEvents();

  const hidden = catalog.products.filter((p) => catalog.publication.get(p.id) !== "visible");

  return (
    <div className="flex flex-col gap-6">
      <Panel icon="globe" title="Storefront /shop">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/shop"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Abrir storefront →
          </Link>
          <p className="text-sm text-muted">
            Regla obligatoria: visible ⇔ available &gt; 0 ∧ elegible ∧ OWNED_STOCK. Los agotados se
            ocultan del público y aquí se listan como «Out of stock / Hidden».
          </p>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Stat label="Productos oficiales" value={String(catalog.products.length)} />
          <Stat label="Visibles al público" value={String(catalog.visibleProducts.length)} />
          <Stat label="Ocultos" value={String(hidden.length)} />
          <Stat label="Eventos registrados" value={String(events.length)} />
        </dl>
      </Panel>

      <Panel icon="eye" title="Ocultos del storefront (visibles solo en Admin)">
        {hidden.length === 0 ? (
          <p className="text-sm text-muted">Nada oculto: todo el catálogo oficial está publicado.</p>
        ) : (
          <ul className="grid gap-1.5 text-sm">
            {hidden.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-1.5">
                <span>{p.title}</span>
                <span className="text-xs text-warn">
                  {catalog.publication.get(p.id) === "hidden_out_of_stock"
                    ? "Out of stock — hidden from storefront"
                    : catalog.publication.get(p.id) === "hidden_not_eligible"
                      ? "No elegible (decisión pendiente del operador)"
                      : "Sin clasificación OWNED_STOCK"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel icon="bolt" title="Feature flags (§85)">
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {FEATURE_FLAGS.map((f) => (
            <li key={f.name} className="flex items-start justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
              <div>
                <p className="font-mono text-xs">{f.name}</p>
                <p className="mt-0.5 text-[0.7rem] text-muted">{f.description}</p>
                {f.gate ? <p className="mt-0.5 text-[0.7rem] text-warn">Puerta: {f.gate}</p> : null}
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[0.65rem] ${f.enabled ? "bg-ok/15 text-ok" : "bg-err/15 text-err"}`}>
                {f.enabled ? "ON" : "OFF"}
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel icon="users" title="Roles declarados (§62)">
        <p className="mb-2 text-xs text-muted">
          Catálogo declarativo; el enforcement llega con la identidad compartida de Nexus (sin cuentas
          nuevas por tienda).
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {STORE_ROLES.map((r) => (
            <li key={r.id} className="rounded-full border border-border px-2.5 py-1 text-[0.7rem] text-muted">
              {r.label} · {r.capabilities.length} cap.
            </li>
          ))}
        </ul>
      </Panel>

      <Panel icon="activity" title="Eventos recientes (§73)">
        {events.length === 0 ? (
          <p className="text-sm text-muted">Sin eventos aún.</p>
        ) : (
          <ul className="grid gap-1 font-mono text-xs text-muted">
            {[...events]
              .sort((a, b) => (a.at < b.at ? 1 : -1))
              .slice(0, 20)
              .map((e) => (
                <li key={e.id}>
                  {e.at.slice(11, 19)} · {e.name}
                  {e.correlationId ? ` · ${e.correlationId.slice(0, 18)}` : ""}
                </li>
              ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.7rem] uppercase tracking-wider text-faint">{label}</dt>
      <dd className="mt-0.5 font-mono text-lg">{value}</dd>
    </div>
  );
}
