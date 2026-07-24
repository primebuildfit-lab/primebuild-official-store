import "server-only";
import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
  MirrorCollectionRecord,
  ShopifyCatalogMirrorRecord,
  SyncState,
} from "@/lib/catalog-mirror";

/**
 * Almacén del mirror en el SERVIDOR (PBOS-SCLP-FABLE-002 §10, §33): un archivo
 * JSON con escritura atómica (tmp + rename) en el directorio de datos de la
 * app. El storefront lee SIEMPRE de aquí (catálogo cacheado, jamás una llamada
 * a Shopify por render) y si la fuente cae se sigue sirviendo el último mirror
 * válido marcado Stale (§31). No guarda secretos.
 */

export interface SyncRunRecord {
  id: string;
  kind: "full" | "incremental" | "reconciliation" | "snapshot_import";
  startedAt: string;
  finishedAt?: string;
  ok: boolean;
  productsSeen: number;
  productsUpserted: number;
  productsRetired: number;
  collectionsSeen: number;
  error?: string;
}

export interface MirrorFileStore {
  v: 1;
  updatedAt: string;
  meta: {
    state: SyncState;
    lastFullSyncAt?: string;
    lastIncrementalAt?: string;
    lastEventAt?: string;
    lastReconciliationAt?: string;
    lastError?: string;
    source?: string;
  };
  products: ShopifyCatalogMirrorRecord[];
  collections: MirrorCollectionRecord[];
  runs: SyncRunRecord[];
}

const EMPTY: MirrorFileStore = {
  v: 1,
  updatedAt: new Date(0).toISOString(),
  meta: { state: "Authentication required" },
  products: [],
  collections: [],
  runs: [],
};

function storePath(): string {
  const dir =
    process.env.PBOS_DATA_DIR && process.env.PBOS_DATA_DIR.trim()
      ? process.env.PBOS_DATA_DIR
      : join(process.cwd(), ".data");
  return join(dir, "mirror-store.json");
}

export function readMirrorStore(): MirrorFileStore {
  try {
    const p = storePath();
    if (!existsSync(p)) return { ...EMPTY };
    const parsed = JSON.parse(readFileSync(p, "utf8")) as MirrorFileStore;
    if (parsed.v !== 1 || !Array.isArray(parsed.products)) return { ...EMPTY };
    return parsed;
  } catch {
    return { ...EMPTY };
  }
}

export function writeMirrorStore(store: MirrorFileStore): void {
  const p = storePath();
  mkdirSync(dirname(p), { recursive: true });
  const tmp = `${p}.tmp`;
  writeFileSync(tmp, JSON.stringify({ ...store, updatedAt: new Date().toISOString() }));
  renameSync(tmp, p);
}

/** Antigüedad tras la cual el mirror se declara Stale (§21). */
export const STALE_AFTER_HOURS = 24;

export function effectiveState(store: MirrorFileStore, nowIso: string): SyncState {
  if (store.products.length === 0) return store.meta.state;
  const last =
    store.meta.lastIncrementalAt ?? store.meta.lastFullSyncAt ?? store.updatedAt;
  const stale = Date.parse(nowIso) - Date.parse(last) > STALE_AFTER_HOURS * 3600_000;
  if (store.meta.state === "Synced" && stale) return "Stale";
  return store.meta.state;
}
