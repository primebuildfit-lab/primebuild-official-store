"use client";

import { useMemo, useState } from "react";
import { Panel } from "@/components/ds";
import { localId } from "@/lib/local-collection";
import { INVENTORY_SCHEMA_VERSION, reverseMovement, type InventoryMovement } from "@/lib/inventory";
import { fastShippingVerdict } from "@/lib/owned-inventory";
import { computeVariantPrice } from "@/lib/store-pricing";
import { officialFromMirror } from "@/lib/mirror-card";
import { useLiveCatalog, useMovements, useStoreEvents } from "@/lib/official-store-data";
import { formatPb, formatUsd } from "@/lib/pb-exchange/pb-exchange-sdk";

/**
 * Wizard de recepción del primer stock (MEGA-004 004E): producto espejado →
 * variante/SKU → almacén → cantidad/condición/motivo → contabilización en el
 * ledger append-only → verificación inmediata (onHand, available, visibilidad
 * pública, precio PB/USD, envío rápido). El modo DEMO etiqueta el movimiento
 * y JAMÁS convierte el stock del proveedor en propio: la cantidad la tecleas
 * tú porque las unidades están físicamente delante.
 */
export function ReceivingWizard() {
  const live = useLiveCatalog();
  const movements = useMovements();
  const { emit } = useStoreEvents();

  const [productId, setProductId] = useState("");
  const [variantIdx, setVariantIdx] = useState(0);
  const [warehouseId, setWarehouseId] = useState("alm-principal");
  const [qty, setQty] = useState(1);
  const [condition, setCondition] = useState<"ok" | "dañado" | "cuarentena">("ok");
  const [costUsd, setCostUsd] = useState("");
  const [evidence, setEvidence] = useState("");
  const [demo, setDemo] = useState(true);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const mirror = live.mirrorProducts.find((p) => p.shopifyProductId === productId);
  const variant = mirror?.variants[variantIdx];
  const sku = variant?.sku?.trim() ?? "";
  const ownedNow = sku ? live.ownedAvailableBySku(sku) : 0;

  const priceCheck = useMemo(() => {
    if (!mirror || !variant?.priceUsd) return null;
    const official = officialFromMirror(mirror);
    const v = official.variants.find((x) => x.sku === variant.sku) ?? official.variants[0];
    if (!v) return null;
    const r = computeVariantPrice(official, v, new Date().toISOString(), localId);
    return r.ok ? r.quote.snapshot : null;
  }, [mirror, variant]);

  const receive = () => {
    setNotice(null);
    if (!mirror || !variant || !sku) {
      setNotice("Elige un producto espejado con SKU en la variante (el SKU enlaza el ledger).");
      return;
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      setNotice("Cantidad entera positiva.");
      return;
    }
    if (!evidence.trim() && !demo) {
      setNotice("Una recepción real exige evidencia de origen (albarán, foto, OC…).");
      return;
    }
    const now = new Date().toISOString();
    const rid = `wiz_${localId()}`;
    const movement: InventoryMovement = {
      id: localId(),
      movementType: "recepcion",
      sku,
      productId: mirror.shopifyProductId,
      warehouseId: warehouseId.trim() || "alm-principal",
      quantity: qty,
      unit: "unidad",
      condition,
      direction: "in",
      sourceType: "recepcion",
      sourceId: rid,
      correlationId: rid,
      actor: "receiving-wizard",
      reason: `${demo ? "[DEMO] " : ""}Recepción wizard — ${mirror.title} (${variant.title})${
        costUsd.trim() ? ` · costo observado $${costUsd.trim()}` : ""
      }${evidence.trim() ? ` · evidencia: ${evidence.trim()}` : ""}`,
      occurredAt: now,
      recordedAt: now,
      status: "publicado",
      version: INVENTORY_SCHEMA_VERSION,
    };
    movements.append(movement);
    emit("official_inventory.received", { sku, qty, demo: demo ? 1 : 0 }, rid);
    setReceiptId(rid);
  };

  const lastWizardMovement = [...movements.entries]
    .reverse()
    .find((m) => m.sourceType === "recepcion" && m.actor === "receiving-wizard" && !m.reversalOf);
  const alreadyReversed = lastWizardMovement
    ? movements.entries.some((m) => m.reversalOf === lastWizardMovement.id)
    : false;

  const reverseLast = () => {
    if (!lastWizardMovement || alreadyReversed) return;
    const rev = reverseMovement(
      lastWizardMovement,
      "receiving-wizard",
      "Corrección auditada del wizard (movimiento compensatorio)",
    );
    movements.append(rev);
    setNotice(`Revertido ${lastWizardMovement.id} con movimiento compensatorio (append-only).`);
  };

  const verdict = mirror
    ? fastShippingVerdict({
        stockConfirmed: ownedNow > 0,
        warehouseAssigned: true,
        carrierServiceAvailable: false,
        cutoffDefined: false,
        destinationEligible: true,
        slaRegistered: false,
      })
    : null;

  return (
    <div className="flex flex-col gap-6">
      {notice ? (
        <p className="rounded-lg border border-warn/50 bg-warn/10 px-4 py-2 text-sm text-warn">{notice}</p>
      ) : null}

      <Panel icon="inbox" title="1 · Producto espejado y variante">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[0.7rem] uppercase tracking-wider text-faint">Producto (espejo Shopify)</span>
            <select
              className="rounded-lg border border-border bg-surface px-3 py-2"
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setVariantIdx(0);
              }}
            >
              <option value="">— elegir —</option>
              {live.mirrorProducts.map((p) => (
                <option key={p.shopifyProductId} value={p.shopifyProductId}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[0.7rem] uppercase tracking-wider text-faint">Variante / SKU (mapea el ledger)</span>
            <select
              className="rounded-lg border border-border bg-surface px-3 py-2"
              value={variantIdx}
              onChange={(e) => setVariantIdx(Number(e.target.value))}
              disabled={!mirror}
            >
              {(mirror?.variants ?? []).map((v, i) => (
                <option key={v.shopifyVariantId} value={i}>
                  {v.title} · {v.sku ?? "SIN SKU"}
                </option>
              ))}
            </select>
          </label>
        </div>
        {mirror && variant ? (
          <p className="mt-2 text-xs text-muted">
            SKU/código: <span className="font-mono">{sku || "—"}</span> · barcode:{" "}
            <span className="font-mono">{variant.barcode ?? "no registrado"}</span> · stock propio actual:{" "}
            <span className="font-mono">{ownedNow}</span> · stock del proveedor (solo observación, NO se copia):{" "}
            <span className="font-mono">{variant.observedSupplierStock ?? "—"}</span>
          </p>
        ) : null}
      </Panel>

      <Panel icon="warehouse" title="2 · Almacén, cantidad y condición">
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[0.7rem] uppercase tracking-wider text-faint">Almacén</span>
            <input className="rounded-lg border border-border bg-surface px-3 py-2 font-mono" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[0.7rem] uppercase tracking-wider text-faint">Cantidad contada</span>
            <input type="number" min={1} className="rounded-lg border border-border bg-surface px-3 py-2 font-mono" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[0.7rem] uppercase tracking-wider text-faint">Condición</span>
            <select className="rounded-lg border border-border bg-surface px-3 py-2" value={condition} onChange={(e) => setCondition(e.target.value as typeof condition)}>
              <option value="ok">OK (vendible)</option>
              <option value="dañado">Dañado (no vendible)</option>
              <option value="cuarentena">Cuarentena (inspección)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[0.7rem] uppercase tracking-wider text-faint">Costo observado USD (opcional)</span>
            <input className="rounded-lg border border-border bg-surface px-3 py-2 font-mono" placeholder="p. ej. 12.40" value={costUsd} onChange={(e) => setCostUsd(e.target.value)} />
          </label>
        </div>
        <label className="mt-3 flex flex-col gap-1 text-sm">
          <span className="text-[0.7rem] uppercase tracking-wider text-faint">Evidencia de origen (albarán/OC/foto — obligatoria si no es DEMO)</span>
          <input className="rounded-lg border border-border bg-surface px-3 py-2" value={evidence} onChange={(e) => setEvidence(e.target.value)} />
        </label>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
          Recepción <strong>DEMO</strong> (etiquetada en el motivo; para el ensayo del flujo)
        </label>
        <button onClick={receive} className="mt-4 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">
          Contabilizar recepción en el ledger
        </button>
      </Panel>

      {receiptId && mirror && variant ? (
        <Panel icon="check" title="3 · Verificación inmediata">
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <Item label="Stock propio (available)" value={String(live.ownedAvailableBySku(sku))} />
            <Item label="Visible al público" value={live.publicProducts.some((p) => p.shopifyProductId === mirror.shopifyProductId) ? "SÍ" : "No (política/condición)"} />
            <Item label="Precio PB" value={priceCheck ? formatPb(priceCheck.pbDisplay) : "—"} />
            <Item label="USD (VN)" value={priceCheck ? formatUsd(priceCheck.vnUsd) : "—"} />
          </dl>
          <p className="mt-2 text-xs text-muted">
            Envío rápido: {verdict?.eligible ? "elegible" : `no elegible (faltan: ${verdict?.missing.join(", ")})`}.
            Recibo <span className="font-mono">{receiptId}</span> — idempotente, auditado con actor y motivo.
          </p>
          <a href={`/shop/products/${mirror.handle}`} target="_blank" className="mt-2 inline-block text-sm text-accent underline">
            Ver en el storefront ↗
          </a>
        </Panel>
      ) : null}

      <Panel icon="undo" title="Corrección auditada">
        {lastWizardMovement ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="font-mono text-xs">
              Último: {lastWizardMovement.sku} +{lastWizardMovement.quantity} ({lastWizardMovement.condition}) · {lastWizardMovement.occurredAt.slice(0, 16).replace("T", " ")}
            </span>
            <button
              onClick={reverseLast}
              disabled={alreadyReversed}
              className="rounded-lg border border-border px-3 py-1.5 text-xs hover:border-accent disabled:opacity-40"
            >
              {alreadyReversed ? "Ya revertido" : "Revertir con movimiento compensatorio"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted">Sin recepciones del wizard todavía.</p>
        )}
        <p className="mt-2 text-xs text-faint">
          El ledger es append-only: nada se borra; corregir = movimiento inverso con motivo.
        </p>
      </Panel>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.7rem] uppercase tracking-wider text-faint">{label}</dt>
      <dd className="mt-0.5 font-mono">{value}</dd>
    </div>
  );
}
