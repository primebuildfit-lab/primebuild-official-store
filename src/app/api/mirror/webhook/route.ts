import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { readMirrorStore, writeMirrorStore } from "@/server/mirror/store";

export const dynamic = "force-dynamic";

/**
 * Receptor de webhooks de Shopify (PBOS-SCLP-FABLE-002 §18, §38): verifica la
 * firma HMAC-SHA256 (X-Shopify-Hmac-Sha256) con SHOPIFY_WEBHOOK_SECRET y solo
 * MARCA el evento (lastEventAt + tema) para que la próxima reconciliación
 * priorice. No confía en el payload para escribir el catálogo: la verdad se
 * relee de la fuente (anti-spoof / anti-replay: firma + no efecto directo).
 * Sin secreto configurado responde 401 honesto. El registro del webhook en
 * Shopify requiere URL pública (gap documentado para la app de escritorio).
 */
export async function POST(req: Request) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "SHOPIFY_WEBHOOK_SECRET no configurado" },
      { status: 401 },
    );
  }
  const raw = Buffer.from(await req.arrayBuffer());
  const given = req.headers.get("x-shopify-hmac-sha256") ?? "";
  const expected = createHmac("sha256", secret).update(raw).digest("base64");
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ ok: false, error: "Firma inválida" }, { status: 401 });
  }
  const topic = req.headers.get("x-shopify-topic") ?? "unknown";
  const store = readMirrorStore();
  store.meta.lastEventAt = new Date().toISOString();
  store.meta.state = store.products.length > 0 ? "Pending" : store.meta.state;
  writeMirrorStore(store);
  return NextResponse.json({ ok: true, topic, queued: "reconciliation" });
}
