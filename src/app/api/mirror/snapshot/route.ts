import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { importSnapshot } from "@/server/mirror/sync.service";
import type { MirrorCollectionRecord, ShopifyCatalogMirrorRecord } from "@/lib/catalog-mirror";

export const dynamic = "force-dynamic";

/**
 * Carga el snapshot REAL empaquetado del catálogo activo (capturado del Admin
 * API el 2026-07-24) a través del mismo pipeline idempotente de sync. Queda en
 * estado Stale: una foto etiquetada nunca se declara «Synced» (§21, §31).
 */
export async function POST() {
  try {
    const raw = readFileSync(
      join(process.cwd(), "src", "server", "mirror", "snapshot-2026-07-24.json"),
      "utf8",
    );
    const snapshot = JSON.parse(raw) as {
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
