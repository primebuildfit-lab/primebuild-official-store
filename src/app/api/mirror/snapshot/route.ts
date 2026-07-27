import { NextResponse } from "next/server";
import { importSnapshot } from "@/server/mirror/sync.service";
import type { MirrorCollectionRecord, ShopifyCatalogMirrorRecord } from "@/lib/catalog-mirror";
// Import de módulo: el JSON queda EMPAQUETADO en el bundle del servidor, de
// modo que la app instalada (standalone) también puede cargarlo.
import snapshotData from "@/server/mirror/snapshot-2026-07-24.json";

export const dynamic = "force-dynamic";

/**
 * Carga el snapshot REAL empaquetado del catálogo activo (capturado del Admin
 * API el 2026-07-24) a través del mismo pipeline idempotente de sync. Queda en
 * estado Stale: una foto etiquetada nunca se declara «Synced» (§21, §31).
 */
export async function POST() {
  try {
    const snapshot = snapshotData as unknown as {
      capturedAt: string;
      products: ShopifyCatalogMirrorRecord[];
      collections: MirrorCollectionRecord[];
    };
    const result = importSnapshot(snapshot);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Snapshot no disponible" },
      { status: 500 },
    );
  }
}
