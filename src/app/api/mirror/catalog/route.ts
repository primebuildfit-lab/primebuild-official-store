import { NextResponse } from "next/server";
import { effectiveState, readMirrorStore } from "@/server/mirror/store";
import { resolveVisibilityPolicy } from "@/config/visibility-policy";

export const dynamic = "force-dynamic";

/**
 * Catálogo cacheado para el storefront (PBOS-SCLP-FABLE-002 §33): lee SIEMPRE
 * el mirror local — jamás llama a Shopify en el camino de render. Devuelve
 * también la política de visibilidad resuelta y el estado honesto del mirror.
 */
export async function GET() {
  const store = readMirrorStore();
  const now = new Date().toISOString();
  return NextResponse.json({
    state: effectiveState(store, now),
    meta: store.meta,
    updatedAt: store.updatedAt,
    policy: resolveVisibilityPolicy({
      requested: process.env.PBOS_VISIBILITY_POLICY,
      ownerConfirmed: process.env.PBOS_VISIBILITY_OWNER_CONFIRMED,
    }),
    products: store.products,
    collections: store.collections,
  });
}
