/**
 * Precio PB de la Official Store (PBOS-DPB-MEGA-FABLE-001 §35-§41).
 *
 * Todo cálculo delega en el SDK canónico PB_EXCHANGE_V1 (vendored, idéntico al
 * de CoinOS): VN = VA × 0.90 con política versionada, precio principal en PB
 * por quote (jamás hardcodeado), USD como opción secundaria visible, snapshot
 * al añadir al carrito y revalidación en el checkout. La comisión del 1% de
 * transferencias NO se aplica a compras (STORE_PURCHASE_FEE_POLICY).
 */

import {
  calculateStorePrice,
  isQuoteExpired,
  PB_EXCHANGE_SDK_VERSION,
  PRIMEBUILD_OFFICIAL_STORE_PB_DISCOUNT_V1,
  STORE_PURCHASE_FEE_POLICY,
  type StorePriceSnapshot,
  type VaSource,
} from "./pb-exchange/pb-exchange-sdk";
import type { OfficialVariant, PrimeBuildOfficialProduct } from "./official-products";

export const STORE_PRICING_SCHEMA_VERSION = 1;

/** Vigencia por defecto de un quote de precio en el carrito (§38). */
export const PRICE_QUOTE_TTL_MINUTES = 30;

export interface PriceQuote {
  /** priceQuoteId (§38). */
  id: string;
  productId: string;
  variantId: string;
  snapshot: StorePriceSnapshot;
  sdkVersion: string;
  createdAt: string;
  expiresAt: string;
}

export type PriceComputation =
  | { ok: true; quote: PriceQuote }
  | { ok: false; reason: "NO_VA" | "INVALID_VA"; detail: string };

/**
 * Calcula el precio de tienda de una variante: exige VA con fuente declarada
 * (§40) — sin VA no hay precio, nunca se inventa uno.
 */
export function computeVariantPrice(
  product: PrimeBuildOfficialProduct,
  variant: OfficialVariant,
  nowIso: string,
  makeId: () => string,
  ttlMinutes: number = PRICE_QUOTE_TTL_MINUTES,
): PriceComputation {
  if (!variant.vaUsd || !variant.vaSource || !variant.vaObservedAt) {
    return {
      ok: false,
      reason: "NO_VA",
      detail: `La variante «${variant.title}» no tiene VA con fuente declarada; no se muestra precio.`,
    };
  }
  if (!/^\d+(\.\d+)?$/.test(variant.vaUsd) || parseFloat(variant.vaUsd) <= 0) {
    return { ok: false, reason: "INVALID_VA", detail: `VA inválido: ${variant.vaUsd}` };
  }
  const snapshot = calculateStorePrice({
    vaUsd: variant.vaUsd,
    vaSource: variant.vaSource as VaSource,
    vaObservedAt: variant.vaObservedAt,
    at: nowIso,
  });
  const expiresAt = new Date(Date.parse(nowIso) + ttlMinutes * 60_000).toISOString();
  return {
    ok: true,
    quote: {
      id: makeId(),
      productId: product.id,
      variantId: variant.id,
      snapshot,
      sdkVersion: PB_EXCHANGE_SDK_VERSION,
      createdAt: nowIso,
      expiresAt,
    },
  };
}

/* ───────────────────── Revalidación en checkout §38 ───────────────────── */

export interface RevalidationResult {
  stillValid: boolean;
  changes: string[];
  /** Snapshot fresco para reconfirmar si hubo cambios. */
  freshSnapshot?: StorePriceSnapshot;
}

/**
 * Revalida un quote al pasar al checkout: caducidad, VA vigente y política.
 * Si algo cambió, se muestran los cambios y se exige confirmación explícita;
 * nunca se cobra con un snapshot obsoleto en silencio.
 */
export function revalidatePriceQuote(
  quote: PriceQuote,
  currentVariant: OfficialVariant | undefined,
  nowIso: string,
): RevalidationResult {
  const changes: string[] = [];
  if (isQuoteExpired({ expiresAt: quote.expiresAt }, nowIso)) {
    changes.push("El quote de precio caducó.");
  }
  if (!currentVariant) {
    changes.push("La variante ya no existe en el catálogo.");
    return { stillValid: false, changes };
  }
  if (currentVariant.vaUsd !== quote.snapshot.vaUsd.replace(/\.00$/, "") &&
      currentVariant.vaUsd !== quote.snapshot.vaUsd) {
    changes.push(
      `El VA cambió de ${quote.snapshot.vaUsd} a ${currentVariant.vaUsd ?? "sin VA"}.`,
    );
  }
  if (changes.length === 0) return { stillValid: true, changes };

  if (!currentVariant.vaUsd || !currentVariant.vaSource || !currentVariant.vaObservedAt) {
    return { stillValid: false, changes };
  }
  const freshSnapshot = calculateStorePrice({
    vaUsd: currentVariant.vaUsd,
    vaSource: currentVariant.vaSource as VaSource,
    vaObservedAt: currentVariant.vaObservedAt,
    at: nowIso,
  });
  return { stillValid: false, changes, freshSnapshot };
}

/* ───────────────────── Desglose de checkout §41 ───────────────────── */

export interface CheckoutFeeBreakdown {
  itemsUsd: string;
  storeDiscountUsd: string;
  transferFeeUsd: "0.00";
  providerFee: "unknown_no_provider";
  shippingUsd: string | "not_quoted";
  taxesUsd: string | "not_quoted";
  totalUsd: string | "pending_shipping_and_taxes";
  policy: typeof STORE_PURCHASE_FEE_POLICY;
  discountPolicy: typeof PRIMEBUILD_OFFICIAL_STORE_PB_DISCOUNT_V1;
}

/**
 * Desglose §41 con conceptos separados. La comisión del 1% NO aparece en
 * compras (no es una transferencia entre usuarios) y nada se cobra dos veces.
 * Envío/impuestos sin cotizar se declaran, no se ponen a 0.
 */
export function checkoutFeeBreakdown(input: {
  itemsVaTotalUsd: string;
  itemsVnTotalUsd: string;
  shippingUsd?: string;
  taxesUsd?: string;
}): CheckoutFeeBreakdown {
  const va = parseFloat(input.itemsVaTotalUsd);
  const vn = parseFloat(input.itemsVnTotalUsd);
  const discount = (va - vn).toFixed(2);
  const shippingKnown = input.shippingUsd !== undefined;
  const taxesKnown = input.taxesUsd !== undefined;
  const total =
    shippingKnown && taxesKnown
      ? (vn + parseFloat(input.shippingUsd!) + parseFloat(input.taxesUsd!)).toFixed(2)
      : ("pending_shipping_and_taxes" as const);
  return {
    itemsUsd: vn.toFixed(2),
    storeDiscountUsd: discount,
    transferFeeUsd: "0.00",
    providerFee: "unknown_no_provider",
    shippingUsd: shippingKnown ? parseFloat(input.shippingUsd!).toFixed(2) : "not_quoted",
    taxesUsd: taxesKnown ? parseFloat(input.taxesUsd!).toFixed(2) : "not_quoted",
    totalUsd: total,
    policy: STORE_PURCHASE_FEE_POLICY,
    discountPolicy: PRIMEBUILD_OFFICIAL_STORE_PB_DISCOUNT_V1,
  };
}
