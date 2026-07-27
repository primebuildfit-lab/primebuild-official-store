import { NextResponse } from "next/server";
import { fullSync, incrementalSync, reconcile } from "@/server/mirror/sync.service";

export const dynamic = "force-dynamic";

/**
 * Dispara sincronización (PBOS-SCLP-FABLE-002 §17, §22): full, incremental o
 * reconciliación. Solo lectura contra Shopify; sin credenciales responde con
 * el estado honesto «Authentication required».
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { mode?: string };
  const mode = body.mode ?? "full";
  const result =
    mode === "incremental" ? await incrementalSync() : mode === "reconcile" ? await reconcile() : await fullSync();
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
