import { NextResponse } from "next/server";
import { isStoreConnected } from "@/server/integrations/store/config";
import { app } from "@/config/app";

/**
 * Liveness/health probe for PrimeBuild Official Store.
 *
 * The desktop shell (Tauri) polls this endpoint on 127.0.0.1 to know when the
 * bundled local server is ready before it navigates the window to the app. It is
 * intentionally lightweight and makes no external calls: it reports that the
 * process is up and whether the live store is connected — it never contacts
 * Shopify, so readiness never depends on the network.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "healthy",
    app: app.name,
    version: app.version,
    storeConnected: isStoreConnected(),
    time: new Date().toISOString(),
  });
}
