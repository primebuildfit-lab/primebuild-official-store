/**
 * Componentes PB compartidos del ecosistema (PBOS-DPB-MEGA-FABLE-001 §60).
 *
 * Presentacionales y autocontenidos (solo dependen del SDK vendored y de
 * Tailwind), pensados para copiarse idénticos entre apps: PBAmount, PBQuote,
 * PBRateBadge, PBTransferFee, PBProviderState, PBLegacyProfileBadge,
 * PBExchangeProfileBadge, PBPriceBreakdown. No calculan nada por su cuenta:
 * muestran resultados del contrato PB_EXCHANGE_V1.
 */

import {
  BUY_RATE_LABEL,
  SELL_RATE_LABEL,
  formatPb,
  formatUsd,
  type PbQuote as SdkQuote,
  type ProviderState,
  type StorePriceSnapshot,
  type TransferFeeBreakdown,
} from "@/lib/pb-exchange/pb-exchange-sdk";

/** Importe PB principal, con USD secundario opcional (§37: USD nunca se esconde). */
export function PBAmount({
  pb,
  usdEquivalent,
  size = "md",
}: {
  pb: string;
  usdEquivalent?: string;
  size?: "sm" | "md" | "lg";
}) {
  const cls = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-lg";
  return (
    <span className="inline-flex flex-col leading-tight">
      <span className={`font-mono font-semibold ${cls}`}>{formatPb(pb)}</span>
      {usdEquivalent !== undefined ? (
        <span className="text-xs text-neutral-400">≈ {formatUsd(usdEquivalent)} observado</span>
      ) : null}
    </span>
  );
}

/** Etiquetas literales de tasa del propietario. */
export function PBRateBadge({ direction }: { direction: "buy" | "sell" }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[0.7rem] text-amber-400">
      {direction === "buy" ? BUY_RATE_LABEL : SELL_RATE_LABEL}
    </span>
  );
}

/** Cotización PB completa en línea. */
export function PBQuote({ quote }: { quote: SdkQuote }) {
  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-900/40 p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono">
          {quote.inputAmount} {quote.inputCurrency} → {quote.netDisplay} {quote.outputCurrency}
        </span>
        <span className="text-[0.7rem] text-neutral-400">{quote.rateUsed.label}</span>
      </div>
      <p className="mt-1 text-[0.7rem] text-neutral-500">
        Solo cotización — sin efecto real. Snapshot: {quote.snapshot.at}
      </p>
    </div>
  );
}

/** Comisión del 1% desglosada — nunca oculta (§26). */
export function PBTransferFee({ breakdown }: { breakdown: TransferFeeBreakdown }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
      <dt className="text-neutral-400">Comisión 1%</dt>
      <dd className="text-right font-mono">{formatPb(breakdown.feePb)}</dd>
      <dt className="text-neutral-400">Remitente paga</dt>
      <dd className="text-right font-mono">{formatPb(breakdown.senderPaysPb)}</dd>
      <dt className="text-neutral-400">Destinatario recibe</dt>
      <dd className="text-right font-mono">{formatPb(breakdown.recipientReceivesPb)}</dd>
    </dl>
  );
}

/** Estado del proveedor financiero, sin simulación. */
export function PBProviderState({ state }: { state: ProviderState }) {
  const live = state.mode === "LIVE";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.7rem] ${
        live
          ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
          : "border border-amber-500/40 bg-amber-500/10 text-amber-400"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-emerald-400" : "bg-amber-400"}`} />
      {live ? "Proveedor LIVE" : "Sin proveedor — cotización/prueba"}
    </span>
  );
}

/** Perfil legado: intacto. */
export function PBLegacyProfileBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-neutral-600 bg-neutral-800/60 px-2 py-0.5 text-[0.7rem] text-neutral-300">
      Puntos PB legados — intactos
    </span>
  );
}

/** Perfil nuevo PB_EXCHANGE_V1. */
export function PBExchangeProfileBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 font-mono text-[0.7rem] text-violet-300">
      PB_EXCHANGE_V1
    </span>
  );
}

/** Desglose completo del precio de tienda (§39): VA, descuento, VN, PB, ahorro. */
export function PBPriceBreakdown({ snapshot }: { snapshot: StorePriceSnapshot }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
      <dt className="text-neutral-400">Precio de referencia</dt>
      <dd className="text-right font-mono">{formatUsd(snapshot.vaUsd)}</dd>
      <dt className="text-neutral-400">Descuento Official Store</dt>
      <dd className="text-right font-mono">−{formatUsd(snapshot.discountUsd)}</dd>
      <dt className="text-neutral-400">Precio nuevo</dt>
      <dd className="text-right font-mono">{formatUsd(snapshot.vnUsd)}</dd>
      <dt className="text-neutral-400">PB equivalente</dt>
      <dd className="text-right font-mono font-semibold">{formatPb(snapshot.pbDisplay)}</dd>
      <dt className="text-neutral-400">Ahorro</dt>
      <dd className="text-right font-mono text-emerald-400">{formatUsd(snapshot.savingsUsd)}</dd>
      <dt className="col-span-2 mt-1 text-[0.65rem] text-neutral-500">
        Política {snapshot.policyId} v{snapshot.policyVersion} · VA de {snapshot.vaSource} (
        {snapshot.vaObservedAt.slice(0, 10)})
      </dt>
    </dl>
  );
}
