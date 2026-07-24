"use client";

import { useMemo, useState } from "react";
import { Panel } from "@/components/ds";
import { PBPriceBreakdown, PBRateBadge } from "@/components/pb/pb-components";
import { localId } from "@/lib/local-collection";
import { computeVariantPrice } from "@/lib/store-pricing";
import { useOfficialProducts, useStorefrontCatalog } from "@/lib/official-store-data";
import {
  BUY_RATE_LABEL,
  SELL_RATE_LABEL,
  PI_DECIMAL,
  PRIMEBUILD_OFFICIAL_STORE_PB_DISCOUNT_V1,
  STORE_PURCHASE_FEE_POLICY,
  TRANSFER_FEE_RATE_DECIMAL,
  validateRoundTrip,
  type StorePriceSnapshot,
} from "@/lib/pb-exchange/pb-exchange-sdk";

/**
 * Precios PB de la Official Store (§35-§41): política versionada VN = VA × 0.90,
 * conversión con el contrato PB_EXCHANGE_V1, estado del validador anti-arbitraje
 * y vista por variante con fuente del VA. También permite fijar elegibilidad
 * del storefront por producto (decisión explícita del operador).
 */
export function PbPricingBoard() {
  const products = useOfficialProducts();
  const catalog = useStorefrontCatalog();
  const [preview, setPreview] = useState<StorePriceSnapshot | null>(null);

  const roundTrip = useMemo(() => validateRoundTrip(), []);

  return (
    <div className="flex flex-col gap-6">
      <Panel icon="coins" title="Política de precio y tasas del contrato">
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Item
            label="Política de descuento"
            value={`${PRIMEBUILD_OFFICIAL_STORE_PB_DISCOUNT_V1.id} v${PRIMEBUILD_OFFICIAL_STORE_PB_DISCOUNT_V1.version} (${PRIMEBUILD_OFFICIAL_STORE_PB_DISCOUNT_V1.discountRateDecimal})`}
          />
          <Item label="Compra" value={BUY_RATE_LABEL} />
          <Item label="Venta" value={SELL_RATE_LABEL} />
          <Item label="Comisión transferencia" value={`${TRANSFER_FEE_RATE_DECIMAL} — NO aplica a compras`} />
        </dl>
        <p className="mt-3 break-all font-mono text-[0.65rem] text-faint">π = {PI_DECIMAL}…</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <PBRateBadge direction="buy" />
          <PBRateBadge direction="sell" />
          {roundTrip.blockProductionActivation ? (
            <span className="rounded-full border border-err/50 bg-err/10 px-2 py-0.5 text-[0.7rem] text-err">
              Anti-arbitraje: BLOCK_PRODUCTION_ACTIVATION — dinero real bloqueado hasta aprobar dirección
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-muted">{STORE_PURCHASE_FEE_POLICY.rationale}</p>
      </Panel>

      <Panel icon="tag" title="Precios por variante (VA declarado → VN → PB)">
        {products.items.length === 0 ? (
          <p className="text-sm text-muted">
            Sin productos oficiales. Importa plantillas desde el Espejo del catálogo.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[0.7rem] uppercase tracking-wider text-faint">
                <tr>
                  <th className="py-2 pr-3">Producto / variante</th>
                  <th className="py-2 pr-3">VA (fuente)</th>
                  <th className="py-2 pr-3">VN</th>
                  <th className="py-2 pr-3">PB principal</th>
                  <th className="py-2 pr-3">Elegible storefront</th>
                  <th className="py-2">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {products.items.flatMap((p) =>
                  p.variants.map((v) => {
                    const r = v.vaUsd ? computeVariantPrice(p, v, new Date().toISOString(), localId) : null;
                    return (
                      <tr key={v.id} className="border-t border-border/60">
                        <td className="py-2 pr-3">
                          {p.title} <span className="text-faint">· {v.title}</span>
                        </td>
                        <td className="py-2 pr-3 font-mono text-xs">
                          {v.vaUsd ? `$${v.vaUsd} (${v.vaSource})` : "Sin VA — sin precio"}
                        </td>
                        <td className="py-2 pr-3 font-mono text-xs">
                          {r?.ok ? `$${r.quote.snapshot.vnUsd}` : "—"}
                        </td>
                        <td className="py-2 pr-3 font-mono text-xs text-accent">
                          {r?.ok ? `${r.quote.snapshot.pbDisplay} PB` : "—"}
                        </td>
                        <td className="py-2 pr-3">
                          <button
                            onClick={() =>
                              products.update(p.id, {
                                officialStoreEligible: !p.officialStoreEligible,
                                status: "ready",
                                updatedAt: new Date().toISOString(),
                              })
                            }
                            className={`rounded-full px-2.5 py-0.5 text-[0.7rem] ${
                              p.officialStoreEligible
                                ? "bg-ok/15 text-ok"
                                : "border border-border text-muted hover:border-accent"
                            }`}
                          >
                            {p.officialStoreEligible ? "Elegible ✓" : "Marcar elegible"}
                          </button>
                        </td>
                        <td className="py-2">
                          {r?.ok ? (
                            <button
                              onClick={() => setPreview(r.quote.snapshot)}
                              className="rounded-lg border border-border px-2.5 py-1 text-xs hover:border-accent"
                            >
                              Desglose
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  }),
                )}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-faint">
          La visibilidad pública sigue exigiendo stock disponible (§10): elegible sin stock = oculto como
          «Out of stock». Visibles ahora: {catalog.visibleProducts.length}.
        </p>
      </Panel>

      {preview ? (
        <Panel icon="eye" title="Desglose del precio (snapshot)">
          <PBPriceBreakdown snapshot={preview} />
        </Panel>
      ) : null}
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.7rem] uppercase tracking-wider text-faint">{label}</dt>
      <dd className="mt-0.5 font-mono text-xs">{value}</dd>
    </div>
  );
}
