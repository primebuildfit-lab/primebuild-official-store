"use client";

import { useMemo, useState } from "react";
import { Panel } from "@/components/ds";
import { localId } from "@/lib/local-collection";
import {
  isMirrorRecord,
  mirrorMetrics,
  type ShopifyCatalogMirrorRecord,
} from "@/lib/catalog-mirror";
import { importProductFromMirror } from "@/lib/official-products";
import {
  useMirror,
  useOfficialProducts,
  useStoreEvents,
  useSyncConflicts,
  useTemplates,
} from "@/lib/official-store-data";

/**
 * Centro del espejo Shopify (§9, §53). Descubre productos vía el Admin API
 * (solo lectura, honesto sin credenciales), guarda registros espejo locales,
 * importa plantillas al catálogo oficial y muestra métricas. El stock del
 * proveedor solo se observa; los bulk writes destructivos no existen aquí.
 */
export function MirrorCenter() {
  const mirror = useMirror();
  const products = useOfficialProducts();
  const templates = useTemplates();
  const conflicts = useSyncConflicts();
  const { emit } = useStoreEvents();

  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState<ShopifyCatalogMirrorRecord[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [manualJson, setManualJson] = useState("");

  const metrics = useMemo(
    () => mirrorMetrics(mirror.items, templates.items, conflicts.items, new Date().toISOString()),
    [mirror.items, templates.items, conflicts.items],
  );

  const discover = async () => {
    setDiscovering(true);
    setNotice(null);
    try {
      const res = await fetch("/api/mirror/discover");
      const data = (await res.json()) as
        | { connected: false; reason: string }
        | { connected: true; records: unknown[] };
      if (!data.connected) {
        setNotice(`Shopify no conectado: ${data.reason}`);
        setDiscovered(null);
        return;
      }
      const valid = data.records.filter(isMirrorRecord);
      setDiscovered(valid);
      emit("shopify.catalog_discovered", { count: valid.length });
    } catch {
      setNotice("No se pudo consultar el descubrimiento (¿servidor local activo?).");
    } finally {
      setDiscovering(false);
    }
  };

  const saveDiscovered = () => {
    if (!discovered) return;
    const byShopifyId = new Map(mirror.items.map((r) => [r.shopifyProductId, r]));
    const merged = [...mirror.items];
    let added = 0;
    for (const rec of discovered) {
      const existing = byShopifyId.get(rec.shopifyProductId);
      if (existing) {
        const idx = merged.findIndex((r) => r.id === existing.id);
        merged[idx] = { ...rec, id: existing.id };
      } else {
        merged.push(rec);
        added += 1;
      }
    }
    mirror.replaceAll(merged);
    setNotice(`Espejo actualizado: ${added} nuevos, ${discovered.length - added} refrescados.`);
    setDiscovered(null);
  };

  const importManual = () => {
    setNotice(null);
    try {
      const parsed: unknown = JSON.parse(manualJson);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const now = new Date().toISOString();
      const valid = arr
        .map((x) =>
          x !== null && typeof x === "object"
            ? ({
                id: localId(),
                source: "manual_import",
                fetchedAt: now,
                modes: ["TEMPLATE_ONLY", "CATALOG_METADATA"],
                version: 1,
                tags: [],
                collections: [],
                mediaUrls: [],
                options: [],
                variants: [],
                status: "UNKNOWN",
                ...(x as Record<string, unknown>),
              } as unknown)
            : x,
        )
        .filter(isMirrorRecord);
      if (valid.length === 0) {
        setNotice("El JSON no contiene registros de espejo válidos (title, shopifyProductId, variants…).");
        return;
      }
      mirror.replaceAll([...mirror.items, ...valid]);
      setManualJson("");
      setNotice(`${valid.length} registro(s) importados manualmente (fuente: manual_import).`);
    } catch {
      setNotice("JSON inválido.");
    }
  };

  const importTemplate = (rec: ShopifyCatalogMirrorRecord) => {
    const already = products.items.find(
      (p) => p.source.type === "shopify_mirror" && p.source.shopifyProductId === rec.shopifyProductId,
    );
    if (already) {
      setNotice(`Ya existe un producto oficial para ${rec.title} (import idempotente).`);
      return;
    }
    const now = new Date().toISOString();
    const product = importProductFromMirror(rec, now, localId);
    products.add(product);
    emit("shopify.template_copied", { shopifyProductId: rec.shopifyProductId }, rec.shopifyProductId);
    setNotice(
      `Plantilla importada: «${rec.title}». Nace sin stock propio y NO elegible — configura elegibilidad y recibe stock para publicarla.`,
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <Panel icon="refresh" title="Estado del espejo">
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
          <Metric label="Productos descubiertos" value={String(metrics.productsDiscovered)} />
          <Metric label="Plantillas copiadas" value={String(metrics.templatesCopied)} />
          <Metric label="Variantes mapeadas" value={String(metrics.variantsMapped)} />
          <Metric label="Conflictos abiertos" value={String(metrics.conflictsOpen)} />
          <Metric label="Última sincronización" value={metrics.lastSyncAt?.slice(0, 16).replace("T", " ") ?? "Nunca"} />
          <Metric label="Registros obsoletos (>24h)" value={String(metrics.staleRecords)} />
        </dl>
      </Panel>

      <Panel icon="search" title="Descubrimiento (Shopify Admin API, solo lectura)">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={discover}
            disabled={discovering}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {discovering ? "Descubriendo…" : "Descubrir catálogo"}
          </button>
          {discovered ? (
            <button
              onClick={saveDiscovered}
              className="rounded-lg border border-accent px-4 py-2 text-sm text-accent hover:bg-accent/10"
            >
              Guardar {discovered.length} en el espejo
            </button>
          ) : null}
          <span className="text-xs text-muted">
            Sin credenciales configuradas el resultado es honesto: «no conectado», nunca inventado.
          </span>
        </div>
        {notice ? <p className="mt-3 text-sm text-warn">{notice}</p> : null}
        {discovered ? (
          <ul className="mt-3 grid gap-1.5 text-sm">
            {discovered.slice(0, 10).map((r) => (
              <li key={r.shopifyProductId} className="text-muted">
                · {r.title} <span className="text-faint">({r.variants.length} variantes)</span>
              </li>
            ))}
            {discovered.length > 10 ? (
              <li className="text-faint">… y {discovered.length - 10} más</li>
            ) : null}
          </ul>
        ) : null}
      </Panel>

      <Panel icon="upload" title="Importación manual de registros espejo">
        <p className="mb-2 text-xs text-muted">
          Pega JSON de registros espejo (uno o lista). Se etiquetan como <code>manual_import</code> con
          fecha; el stock del proveedor que traigan queda SOLO como observación.
        </p>
        <textarea
          value={manualJson}
          onChange={(e) => setManualJson(e.target.value)}
          rows={4}
          placeholder='[{"shopifyProductId":"gid://…","handle":"…","title":"…","variants":[…]}]'
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs"
        />
        <button
          onClick={importManual}
          disabled={!manualJson.trim()}
          className="mt-2 rounded-lg border border-border px-4 py-2 text-sm hover:border-accent disabled:opacity-50"
        >
          Importar JSON
        </button>
      </Panel>

      <Panel icon="box" title={`Registros del espejo (${mirror.items.length})`}>
        {mirror.items.length === 0 ? (
          <p className="text-sm text-muted">
            Espejo vacío. Descubre el catálogo (con credenciales) o importa registros manualmente.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[0.7rem] uppercase tracking-wider text-faint">
                <tr>
                  <th className="py-2 pr-3">Producto</th>
                  <th className="py-2 pr-3">Variantes</th>
                  <th className="py-2 pr-3">Stock proveedor (observado)</th>
                  <th className="py-2 pr-3">Fuente</th>
                  <th className="py-2 pr-3">Obtenido</th>
                  <th className="py-2">Acción</th>
                </tr>
              </thead>
              <tbody>
                {mirror.items.map((r) => {
                  const imported = products.items.some(
                    (p) => p.source.type === "shopify_mirror" && p.source.shopifyProductId === r.shopifyProductId,
                  );
                  const supplierStock = r.variants.reduce((acc, v) => acc + (v.observedSupplierStock ?? 0), 0);
                  return (
                    <tr key={r.id} className="border-t border-border/60">
                      <td className="py-2 pr-3">{r.title}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{r.variants.length}</td>
                      <td className="py-2 pr-3 font-mono text-xs">
                        {supplierStock} <span className="text-faint">(nunca stock propio)</span>
                      </td>
                      <td className="py-2 pr-3 text-xs">{r.source}</td>
                      <td className="py-2 pr-3 text-xs text-muted">{r.fetchedAt.slice(0, 16).replace("T", " ")}</td>
                      <td className="py-2">
                        {imported ? (
                          <span className="text-xs text-ok">✓ Importado</span>
                        ) : (
                          <button
                            onClick={() => importTemplate(r)}
                            className="rounded-lg border border-border px-3 py-1 text-xs hover:border-accent"
                          >
                            Importar plantilla
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.7rem] uppercase tracking-wider text-faint">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm">{value}</dd>
    </div>
  );
}
