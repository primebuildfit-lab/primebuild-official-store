"use client";

import { useState } from "react";
import { Panel } from "@/components/ds";
import { useLiveCatalog } from "@/lib/official-store-data";

/**
 * Shopify Sync Center (PBOS-SCLP-FABLE-002 §22): conexión, última
 * sincronización, recuentos honestos (activos, espejados, públicos, ocultos
 * sin stock, variantes, medios, stale), y acciones — full sync, incremental,
 * reconciliación, snapshot real empaquetado, habilitar/deshabilitar producto
 * para la Official Store, comparar con la fuente. NUNCA escribe en Shopify.
 */
export function SyncCenter() {
  const live = useLiveCatalog();
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const call = async (label: string, url: string, body?: unknown) => {
    setBusy(label);
    setNotice(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await res.json()) as {
        ok?: boolean;
        state?: string;
        error?: string;
        run?: { productsSeen: number; productsUpserted: number; productsRetired: number; error?: string };
      };
      if (data.run) {
        setNotice(
          data.ok
            ? `${label}: ${data.run.productsSeen} vistos, ${data.run.productsUpserted} actualizados, ${data.run.productsRetired} retirados → estado ${data.state}.`
            : `${label} falló: ${data.run.error ?? data.error ?? "error"} → estado ${data.state}.`,
        );
      } else {
        setNotice(data.ok ? `${label}: OK` : `${label}: ${data.error ?? "error"}`);
      }
      live.refresh();
    } catch (e) {
      setNotice(`${label}: ${e instanceof Error ? e.message : "error de red"}`);
    } finally {
      setBusy(null);
    }
  };

  const activos = live.mirrorProducts.filter((p) => (p.sourceStatus ?? p.status) === "ACTIVE");
  const publicos = live.publicProducts;
  const ocultosSinStock = activos.filter(
    (p) => !publicos.includes(p) && live.ownedAvailableOf(p) === 0,
  );
  const variantes = live.mirrorProducts.reduce((a, p) => a + p.variants.length, 0);
  const medios = live.mirrorProducts.reduce((a, p) => a + p.mediaUrls.length, 0);
  const retirados = live.mirrorProducts.filter((p) => p.syncState === "Removed from source");
  const fallos = live.mirrorProducts.filter((p) => p.syncState === "Failed");

  return (
    <div className="flex flex-col gap-6">
      <Panel icon="refresh" title="Shopify Sync — estado de la conexión">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              live.state === "Synced"
                ? "bg-ok/15 text-ok"
                : live.state === "Stale" || live.state === "Pending"
                  ? "bg-warn/15 text-warn"
                  : "bg-err/15 text-err"
            }`}
          >
            {String(live.state)}
          </span>
          <span className="text-xs text-muted">
            Última escritura del mirror: {live.updatedAt ? live.updatedAt.slice(0, 19).replace("T", " ") : "nunca"} ·
            política: {live.policy?.mode ?? "—"}
            {live.policy && !live.policy.ownerConfirmed && live.policy.requestedMode
              ? ` (solicitada ${live.policy.requestedMode} SIN confirmación del owner)`
              : ""}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => call("Full sync", "/api/mirror/sync", { mode: "full" })}
            disabled={busy !== null}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy === "Full sync" ? "Sincronizando…" : "Run full sync"}
          </button>
          <button
            onClick={() => call("Incremental", "/api/mirror/sync", { mode: "incremental" })}
            disabled={busy !== null}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:border-accent disabled:opacity-50"
          >
            Incremental
          </button>
          <button
            onClick={() => call("Reconciliación", "/api/mirror/sync", { mode: "reconcile" })}
            disabled={busy !== null}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:border-accent disabled:opacity-50"
          >
            Reconcile
          </button>
          <button
            onClick={() => call("Snapshot 2026-07-24", "/api/mirror/snapshot")}
            disabled={busy !== null}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:border-accent disabled:opacity-50"
          >
            Cargar snapshot real (2026-07-24)
          </button>
          <a
            href="https://admin.shopify.com/store/primebuildfit"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-border px-4 py-2 text-sm hover:border-accent"
          >
            Open Shopify source ↗
          </a>
        </div>
        {notice ? <p className="mt-3 text-sm text-warn">{notice}</p> : null}
        <p className="mt-3 text-xs text-faint">
          Sin credenciales el sync responde «Authentication required» y se sigue sirviendo el último
          mirror válido. El snapshot es una foto real etiquetada (queda Stale, nunca «Synced»). Los
          webhooks exigen URL pública: la reconciliación programada es la red de seguridad (§18).
        </p>
      </Panel>

      <Panel icon="activity" title="Recuentos del espejo">
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4 lg:grid-cols-8">
          <Stat label="Activos encontrados" value={activos.length} />
          <Stat label="Espejados (total)" value={live.mirrorProducts.length} />
          <Stat label="Públicos" value={publicos.length} />
          <Stat label="Ocultos sin stock propio" value={ocultosSinStock.length} />
          <Stat label="Variantes" value={variantes} />
          <Stat label="Medios" value={medios} />
          <Stat label="Retirados de la fuente" value={retirados.length} />
          <Stat label="Fallos" value={fallos.length} />
        </dl>
        <p className="mt-2 text-xs text-faint">
          Colecciones espejadas: {live.collections.length}. Draft/Archived jamás se publican; los
          retirados conservan historial y pedidos (§11, §32).
        </p>
      </Panel>

      <Panel icon="eye" title="Productos espejados — visibilidad Official Store">
        {live.mirrorProducts.length === 0 ? (
          <p className="text-sm text-muted">
            Espejo vacío: ejecuta un sync o carga el snapshot real para copiar el catálogo activo.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[0.7rem] uppercase tracking-wider text-faint">
                <tr>
                  <th className="py-2 pr-3">Producto</th>
                  <th className="py-2 pr-3">Fuente</th>
                  <th className="py-2 pr-3">Stock propio</th>
                  <th className="py-2 pr-3">Público</th>
                  <th className="py-2 pr-3">Manual</th>
                  <th className="py-2">Comparar</th>
                </tr>
              </thead>
              <tbody>
                {live.mirrorProducts.slice(0, 60).map((p) => {
                  const owned = live.ownedAvailableOf(p);
                  const isPublic = publicos.includes(p);
                  const enabled = live.manuallyEnabled.has(p.shopifyProductId);
                  return (
                    <tr key={p.id} className="border-t border-border/60">
                      <td className="max-w-[340px] truncate py-2 pr-3">{p.title}</td>
                      <td className="py-2 pr-3 font-mono text-xs">
                        {p.sourceStatus ?? p.status}
                        {p.syncState && p.syncState !== "Synced" ? ` · ${p.syncState}` : ""}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs">{owned}</td>
                      <td className="py-2 pr-3">
                        <span className={`rounded-full px-2 py-0.5 text-[0.7rem] ${isPublic ? "bg-ok/15 text-ok" : "bg-surface-muted text-faint"}`}>
                          {isPublic ? "Visible" : "Oculto"}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        <button
                          onClick={() => live.setManuallyEnabled(p.shopifyProductId, !enabled)}
                          className={`rounded-full px-2.5 py-0.5 text-[0.7rem] ${enabled ? "bg-ok/15 text-ok" : "border border-border text-muted hover:border-accent"}`}
                          title="Solo tiene efecto con la política ACTIVE_AND_MANUALLY_ENABLED"
                        >
                          {enabled ? "Enabled ✓" : "Enable"}
                        </button>
                      </td>
                      <td className="py-2">
                        <a
                          className="text-xs text-accent underline"
                          href={`https://primebuildfit.com/products/${p.handle}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Shopify ↗
                        </a>{" "}
                        <a className="text-xs text-accent underline" href={`/shop/products/${p.handle}`} target="_blank">
                          Clon ↗
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {live.mirrorProducts.length > 60 ? (
              <p className="mt-2 text-xs text-faint">Mostrando 60 de {live.mirrorProducts.length}.</p>
            ) : null}
          </div>
        )}
      </Panel>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[0.7rem] uppercase tracking-wider text-faint">{label}</dt>
      <dd className="mt-0.5 font-mono text-lg">{value}</dd>
    </div>
  );
}
