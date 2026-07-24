/**
 * CoinOS PB Pricing SDK — contrato canónico PB_EXCHANGE_V1.
 * Orden: PBOS-DPB-MEGA-FABLE-001.
 *
 * ESTE ARCHIVO ES EL CONTRATO ÚNICO DEL ECOSISTEMA. CoinOS es su dueño; las
 * demás aplicaciones (PrimeBuild Official Store, PrimeBuild Internal OS,
 * Platform Nexus, Partnera, Eventra) consumen una copia vendored IDÉNTICA en
 * `src/lib/pb-exchange/pb-exchange-sdk.ts` (misma ruta relativa) y NUNCA
 * reimplementan fórmulas ni recodifican π/3.1/1% por su cuenta.
 *
 * Reglas de honestidad del contrato:
 *  - Es un módulo PURO y determinista: sin IO, sin reloj propio, sin
 *    aleatoriedad, sin dependencias. Todo instante lo aporta el llamador.
 *  - Toda la aritmética de valor usa enteros escalados (BigInt) sobre cadenas
 *    decimales. Los números binarios de coma flotante NUNCA tocan un importe:
 *    `PI_RATE`/`SELL_RATE`/`TRANSFER_FEE_RATE` existen solo como referencia
 *    literal de la orden del propietario.
 *  - π nunca se sustituye por 3.14: se representa con 36 decimales y se
 *    redondea UNA sola vez a la precisión interna documentada.
 *  - Este SDK cotiza y previsualiza. NO liquida: sin proveedor financiero
 *    conectado no existe dinero real (`provider_not_connected`).
 */

/* ────────────────────────────── Identidad ────────────────────────────── */

export const PB_EXCHANGE_PROFILE_ID = "PB_EXCHANGE_V1" as const;
export const PB_LEGACY_PROFILE_ID = "PB_LEGACY_POINTS" as const;
export const PB_EXCHANGE_SDK_VERSION = "1.0.0" as const;

export type PBValueProfileId = typeof PB_EXCHANGE_PROFILE_ID | typeof PB_LEGACY_PROFILE_ID;

/** Perfiles de valor PB. El perfil legado NO se toca desde este contrato. */
export const PB_VALUE_PROFILES: Record<
  PBValueProfileId,
  { id: PBValueProfileId; label: string; mutableFromSdk: boolean; description: string }
> = {
  PB_EXCHANGE_V1: {
    id: "PB_EXCHANGE_V1",
    label: "PB Exchange V1",
    mutableFromSdk: false,
    description:
      "Nuevo perfil de cotización/compra/venta/transferencia de PB. Modo cotización hasta que exista proveedor y aprobación del propietario.",
  },
  PB_LEGACY_POINTS: {
    id: "PB_LEGACY_POINTS",
    label: "Puntos PB legados",
    mutableFromSdk: false,
    description:
      "Sistema de puntos/PB existente (rewards). Conserva valores, balances, reglas e historia. Este SDK no lo convierte ni lo migra.",
  },
};

/* ─────────────────────── Tasas literales del propietario ─────────────────────── */

/** Etiquetas EXACTAS definidas por el propietario (no reinterpretar en UI). */
export const BUY_RATE_LABEL = "1 USD = π PB" as const;
export const SELL_RATE_LABEL = "1 USD = 3.1 PB" as const;

/**
 * Constantes de REFERENCIA de la orden (§22). Son floats de JavaScript y por
 * eso NUNCA entran en la aritmética de importes; la fuente de cálculo es la
 * representación decimal de abajo. Los tests verifican la coherencia entre
 * ambas representaciones.
 */
export const PI_RATE = Math.PI;
export const SELL_RATE = 3.1;
export const TRANSFER_FEE_RATE = 0.01;

/** π con 36 decimales (fuente de cálculo; jamás "3.14"). */
export const PI_DECIMAL = "3.141592653589793238462643383279502884" as const;
/** Tasa de venta literal como decimal exacto. */
export const SELL_RATE_DECIMAL = "3.1" as const;
/** Comisión de transferencia: 1% exacto. */
export const TRANSFER_FEE_RATE_DECIMAL = "0.01" as const;

/* ───────────────────────────── Precisión (§27) ───────────────────────────── */

export const PRECISION_POLICY = {
  /** Decimales de la aritmética interna con enteros escalados. */
  internalDecimals: 12,
  /** USD siempre a 2 decimales. */
  usdDecimals: 2,
  /** Presentación de PB por defecto (configurable por app vía opciones). */
  pbDisplayDecimalsDefault: 2,
  /** Redondeo único permitido: mitad hacia arriba (alejándose de cero). */
  rounding: "HALF_UP" as const,
};

const SCALE = 10n ** BigInt(PRECISION_POLICY.internalDecimals);

/* ────────────────────────── Aritmética decimal exacta ────────────────────────── */

export class PbExchangeMathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PbExchangeMathError";
  }
}

/** Parsea una cadena decimal a entero escalado (redondeo half-up si excede la escala). */
export function parseDecimal(value: string | number, decimals = PRECISION_POLICY.internalDecimals): bigint {
  const s = (typeof value === "number" ? String(value) : value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(s)) {
    throw new PbExchangeMathError(`Importe decimal inválido: "${value}"`);
  }
  const neg = s.startsWith("-");
  const [intPart, fracRaw = ""] = (neg ? s.slice(1) : s).split(".");
  const kept = fracRaw.slice(0, decimals).padEnd(decimals, "0");
  let scaled = BigInt(intPart + kept);
  // Redondeo half-up del primer dígito descartado.
  const dropped = fracRaw.slice(decimals);
  if (dropped.length > 0 && dropped.charCodeAt(0) >= 53 /* '5' */) {
    scaled += 1n;
  }
  return neg ? -scaled : scaled;
}

/** Formatea un entero escalado a cadena decimal con `outDecimals` (half-up). */
export function formatScaled(
  scaled: bigint,
  outDecimals: number,
  decimals = PRECISION_POLICY.internalDecimals,
): string {
  if (outDecimals < 0 || !Number.isInteger(outDecimals)) {
    throw new PbExchangeMathError(`Decimales de salida inválidos: ${outDecimals}`);
  }
  const neg = scaled < 0n;
  let abs = neg ? -scaled : scaled;
  if (outDecimals < decimals) {
    const drop = 10n ** BigInt(decimals - outDecimals);
    const q = abs / drop;
    const r = abs % drop;
    abs = r * 2n >= drop ? q + 1n : q;
  } else if (outDecimals > decimals) {
    abs = abs * 10n ** BigInt(outDecimals - decimals);
  }
  const s = abs.toString().padStart(outDecimals + 1, "0");
  const intPart = s.slice(0, s.length - outDecimals) || "0";
  const frac = outDecimals > 0 ? "." + s.slice(s.length - outDecimals) : "";
  return `${neg ? "-" : ""}${intPart}${frac}`;
}

/** Multiplicación de dos enteros escalados (half-up). */
export function mulScaled(a: bigint, b: bigint): bigint {
  const product = a * b;
  const neg = product < 0n;
  const abs = neg ? -product : product;
  const q = abs / SCALE;
  const r = abs % SCALE;
  const rounded = r * 2n >= SCALE ? q + 1n : q;
  return neg ? -rounded : rounded;
}

/** División de dos enteros escalados (half-up). */
export function divScaled(a: bigint, b: bigint): bigint {
  if (b === 0n) throw new PbExchangeMathError("División entre cero.");
  const neg = a < 0n !== b < 0n;
  const absA = a < 0n ? -a : a;
  const absB = b < 0n ? -b : b;
  const numerator = absA * SCALE;
  const q = numerator / absB;
  const r = numerator % absB;
  const rounded = r * 2n >= absB ? q + 1n : q;
  return neg ? -rounded : rounded;
}

const PI_SCALED = parseDecimal(PI_DECIMAL);
const SELL_SCALED = parseDecimal(SELL_RATE_DECIMAL);
const TRANSFER_FEE_SCALED = parseDecimal(TRANSFER_FEE_RATE_DECIMAL);
const ONE_SCALED = SCALE;

/* ──────────────────── Dirección económica de las tasas (§23) ──────────────────── */

export type RateDirectionOption =
  | "CUSTOMER_BUYS_PB"
  | "CUSTOMER_SELLS_PB"
  | "COINOS_BUYS_PB"
  | "COINOS_SELLS_PB";

/**
 * Interpretaciones completas posibles de las dos etiquetas del propietario.
 * Las etiquetas «comprar»/«vender» admiten leerse desde el usuario o desde
 * CoinOS; el contrato NO infiere en silencio (§23): la configuración nace
 * sin decidir y la activación de producción queda bloqueada hasta que el
 * propietario apruebe una dirección explícita.
 */
export type RateInterpretationId = "CUSTOMER_PERSPECTIVE" | "COINOS_PERSPECTIVE";

export interface RateDirectionConfiguration {
  configured: boolean;
  status: "OWNER_DECISION_PENDING" | "OWNER_APPROVED";
  /** Solo presente cuando el propietario ya decidió. */
  interpretation?: RateInterpretationId;
  approvedBy?: string;
  approvedAt?: string;
}

export const DEFAULT_RATE_DIRECTION_CONFIGURATION: RateDirectionConfiguration = {
  configured: false,
  status: "OWNER_DECISION_PENDING",
};

export interface InterpretationRates {
  /** PB que recibe el cliente por 1 USD al comprar PB. */
  customerBuysPbPerUsd: string;
  /** PB que entrega el cliente por 1 USD al vender PB. */
  customerSellsPbPerUsd: string;
  description: string;
}

/** Tasas efectivas por interpretación, derivadas SOLO de las etiquetas literales. */
export function ratesForInterpretation(interpretation: RateInterpretationId): InterpretationRates {
  if (interpretation === "CUSTOMER_PERSPECTIVE") {
    return {
      customerBuysPbPerUsd: PI_DECIMAL,
      customerSellsPbPerUsd: SELL_RATE_DECIMAL,
      description:
        "«Comprar» y «vender» leídos desde el cliente: compra a π PB por USD y vende a 3.1 PB por USD.",
    };
  }
  return {
    customerBuysPbPerUsd: SELL_RATE_DECIMAL,
    customerSellsPbPerUsd: PI_DECIMAL,
    description:
      "«Comprar» y «vender» leídos desde CoinOS: CoinOS compra PB a π por USD (el cliente que vende entrega π) y vende PB a 3.1 por USD.",
  };
}

/* ──────────────────────── Estado del proveedor (§28) ──────────────────────── */

export type ProviderConnectionState =
  | "provider_not_connected"
  | "provider_configured_unverified"
  | "provider_connected";

export interface ProviderState {
  state: ProviderConnectionState;
  /** Mientras no haya proveedor verificado, TODO es cotización/prueba. */
  mode: "QUOTE_TEST_ONLY" | "LIVE";
  financialSourceOfTruth: "PROVIDER_LEDGER" | null;
  detail: string;
}

export interface ProviderStateInput {
  providerConfigured?: boolean;
  providerVerified?: boolean;
  moneyModeEnabled?: boolean;
  ownerDirectionApproved?: boolean;
  arbitrageBlocked?: boolean;
}

/**
 * Deriva el estado del proveedor. LIVE exige TODAS las puertas: proveedor
 * configurado Y verificado, modo dinero habilitado, dirección aprobada por el
 * propietario y validador anti-arbitraje sin bloqueo. Nunca se infiere.
 */
export function getProviderState(input: ProviderStateInput = {}): ProviderState {
  const {
    providerConfigured = false,
    providerVerified = false,
    moneyModeEnabled = false,
    ownerDirectionApproved = false,
    arbitrageBlocked = true,
  } = input;
  if (!providerConfigured) {
    return {
      state: "provider_not_connected",
      mode: "QUOTE_TEST_ONLY",
      financialSourceOfTruth: null,
      detail: "Sin proveedor financiero configurado: solo cotización y prueba. No existe PB dinero real.",
    };
  }
  if (!providerVerified) {
    return {
      state: "provider_configured_unverified",
      mode: "QUOTE_TEST_ONLY",
      financialSourceOfTruth: null,
      detail: "Proveedor configurado pero sin verificación funcional: sigue en modo cotización.",
    };
  }
  const live = moneyModeEnabled && ownerDirectionApproved && !arbitrageBlocked;
  return {
    state: "provider_connected",
    mode: live ? "LIVE" : "QUOTE_TEST_ONLY",
    financialSourceOfTruth: live ? "PROVIDER_LEDGER" : null,
    detail: live
      ? "Proveedor verificado: el ledger del proveedor es la fuente financiera de verdad; CoinOS es producto, reglas y conciliación."
      : "Proveedor verificado pero faltan puertas (modo dinero, dirección aprobada o bloqueo anti-arbitraje activo).",
  };
}

/* ───────────────────────── Snapshot de tasas y quotes ───────────────────────── */

export interface RateSnapshot {
  contract: typeof PB_EXCHANGE_PROFILE_ID;
  sdkVersion: string;
  buyRateLabel: typeof BUY_RATE_LABEL;
  sellRateLabel: typeof SELL_RATE_LABEL;
  piDecimal: string;
  sellRateDecimal: string;
  transferFeeRateDecimal: string;
  directionConfiguration: RateDirectionConfiguration;
  /** Instante aportado por el llamador (ISO-8601). El SDK no tiene reloj. */
  at: string;
}

export function buildRateSnapshot(
  atIso: string,
  direction: RateDirectionConfiguration = DEFAULT_RATE_DIRECTION_CONFIGURATION,
): RateSnapshot {
  return {
    contract: PB_EXCHANGE_PROFILE_ID,
    sdkVersion: PB_EXCHANGE_SDK_VERSION,
    buyRateLabel: BUY_RATE_LABEL,
    sellRateLabel: SELL_RATE_LABEL,
    piDecimal: PI_DECIMAL,
    sellRateDecimal: SELL_RATE_DECIMAL,
    transferFeeRateDecimal: TRANSFER_FEE_RATE_DECIMAL,
    directionConfiguration: direction,
    at: atIso,
  };
}

export type QuoteDirection = "USD_TO_PB" | "PB_TO_USD";

export type QuoteWarningCode =
  | "DIRECTION_INTERPRETATION_PENDING"
  | "PROVIDER_NOT_CONNECTED"
  | "QUOTE_TEST_ONLY"
  | "ROUNDING_APPLIED";

export interface PbQuote {
  profile: typeof PB_EXCHANGE_PROFILE_ID;
  direction: QuoteDirection;
  /** Importe de entrada tal como lo dio el llamador. */
  inputAmount: string;
  inputCurrency: "USD" | "PB";
  /** Bruto convertido antes de comisiones (decimales internos completos). */
  grossAmount: string;
  /** Comisión de transferencia si el llamador la incluyó (0 por defecto: comprar/vender no es transferir). */
  transferFee: string;
  /** Comisión del proveedor (0 sin proveedor; jamás inventada). */
  providerFee: string;
  /** Neto tras comisiones. */
  netAmount: string;
  outputCurrency: "USD" | "PB";
  /** Presentación redondeada del neto (usd: 2 dec; pb: según opción). */
  netDisplay: string;
  rateUsed: { label: string; decimal: string; appliedAs: "PB_PER_USD" | "USD_PER_PB" };
  snapshot: RateSnapshot;
  status: "QUOTE_ONLY";
  warnings: QuoteWarningCode[];
  expiresAt?: string;
}

export interface GetQuoteInput {
  direction: QuoteDirection;
  /** Cadena decimal positiva. */
  amount: string;
  /** Instante ISO aportado por el llamador. */
  at: string;
  /** Vencimiento opcional del quote (ISO). */
  expiresAt?: string;
  directionConfiguration?: RateDirectionConfiguration;
  /** Comisión del proveedor en decimal (p. ej. "0.005"); solo si el proveedor la declaró. */
  providerFeeRateDecimal?: string;
  /** Incluir la comisión de transferencia del 1% (solo si el flujo ES una transferencia). */
  includeTransferFee?: boolean;
  pbDisplayDecimals?: number;
}

/**
 * Cotización pura USD↔PB con las tasas literales del propietario.
 * USD→PB usa la etiqueta de compra (π PB por USD); PB→USD usa la etiqueta de
 * venta (3.1 PB por USD). Mientras la dirección económica no esté aprobada,
 * cada quote lo advierte y permanece QUOTE_ONLY.
 */
export function getQuote(input: GetQuoteInput): PbQuote {
  const {
    direction,
    amount,
    at,
    expiresAt,
    directionConfiguration = DEFAULT_RATE_DIRECTION_CONFIGURATION,
    providerFeeRateDecimal,
    includeTransferFee = false,
    pbDisplayDecimals = PRECISION_POLICY.pbDisplayDecimalsDefault,
  } = input;

  const amountScaled = parseDecimal(amount);
  if (amountScaled <= 0n) throw new PbExchangeMathError("El importe del quote debe ser positivo.");

  const isUsdToPb = direction === "USD_TO_PB";
  const gross = isUsdToPb ? mulScaled(amountScaled, PI_SCALED) : divScaled(amountScaled, SELL_SCALED);

  const transferFee = includeTransferFee ? mulScaled(gross, TRANSFER_FEE_SCALED) : 0n;
  const providerFee = providerFeeRateDecimal
    ? mulScaled(gross, parseDecimal(providerFeeRateDecimal))
    : 0n;
  const net = gross - transferFee - providerFee;

  const warnings: QuoteWarningCode[] = ["QUOTE_TEST_ONLY", "PROVIDER_NOT_CONNECTED"];
  if (!directionConfiguration.configured) warnings.unshift("DIRECTION_INTERPRETATION_PENDING");

  const outDecimals = isUsdToPb ? pbDisplayDecimals : PRECISION_POLICY.usdDecimals;
  const internal = PRECISION_POLICY.internalDecimals;

  return {
    profile: PB_EXCHANGE_PROFILE_ID,
    direction,
    inputAmount: formatScaled(amountScaled, internal),
    inputCurrency: isUsdToPb ? "USD" : "PB",
    grossAmount: formatScaled(gross, internal),
    transferFee: formatScaled(transferFee, internal),
    providerFee: formatScaled(providerFee, internal),
    netAmount: formatScaled(net, internal),
    outputCurrency: isUsdToPb ? "PB" : "USD",
    netDisplay: formatScaled(net, outDecimals),
    rateUsed: isUsdToPb
      ? { label: BUY_RATE_LABEL, decimal: PI_DECIMAL, appliedAs: "PB_PER_USD" }
      : { label: SELL_RATE_LABEL, decimal: SELL_RATE_DECIMAL, appliedAs: "PB_PER_USD" },
    snapshot: buildRateSnapshot(at, directionConfiguration),
    status: "QUOTE_ONLY",
    warnings,
    expiresAt,
  };
}

/** Conversión de conveniencia USD→PB (precio de tienda, §36). */
export function convertUsdToPb(
  usdAmount: string,
  opts: { at: string; pbDisplayDecimals?: number; directionConfiguration?: RateDirectionConfiguration },
): PbQuote {
  return getQuote({
    direction: "USD_TO_PB",
    amount: usdAmount,
    at: opts.at,
    pbDisplayDecimals: opts.pbDisplayDecimals,
    directionConfiguration: opts.directionConfiguration,
  });
}

/** Conversión de conveniencia PB→USD (equivalente observado). */
export function convertPbToUsd(
  pbAmount: string,
  opts: { at: string; directionConfiguration?: RateDirectionConfiguration },
): PbQuote {
  return getQuote({
    direction: "PB_TO_USD",
    amount: pbAmount,
    at: opts.at,
    directionConfiguration: opts.directionConfiguration,
  });
}

/** ¿El quote venció? El llamador aporta el ahora (ISO). */
export function isQuoteExpired(quote: Pick<PbQuote, "expiresAt">, nowIso: string): boolean {
  if (!quote.expiresAt) return false;
  return Date.parse(nowIso) > Date.parse(quote.expiresAt);
}

/* ──────────────────── Comisión de transferencia del 1% (§25) ──────────────────── */

export type TransferFeeModel = "FEE_DEDUCTED_FROM_AMOUNT" | "FEE_ADDED_TO_SENDER";

/** Modelo por defecto recomendado por la orden; configurable por el propietario. */
export const DEFAULT_TRANSFER_FEE_MODEL: TransferFeeModel = "FEE_ADDED_TO_SENDER";

export interface TransferFeeBreakdown {
  model: TransferFeeModel;
  /** Importe que el remitente escribió. */
  requestedPb: string;
  /** Comisión del 1% en PB. */
  feePb: string;
  /** Total que paga el remitente. */
  senderPaysPb: string;
  /** Total que recibe el destinatario. */
  recipientReceivesPb: string;
  feeRateDecimal: typeof TRANSFER_FEE_RATE_DECIMAL;
}

/**
 * Comisión de transferencia: transferFeePB = transferAmountPB × 0.01.
 *  - FEE_DEDUCTED_FROM_AMOUNT: envía 100 → fee 1 → recibe 99.
 *  - FEE_ADDED_TO_SENDER: recibe 100 → fee 1 → remitente paga 101.
 * La comisión nunca se oculta: siempre viaja desglosada.
 */
export function calculateTransferFee(
  transferAmountPb: string,
  model: TransferFeeModel = DEFAULT_TRANSFER_FEE_MODEL,
): TransferFeeBreakdown {
  const amount = parseDecimal(transferAmountPb);
  if (amount <= 0n) throw new PbExchangeMathError("El importe de la transferencia debe ser positivo.");
  const fee = mulScaled(amount, TRANSFER_FEE_SCALED);
  const internal = PRECISION_POLICY.internalDecimals;
  if (model === "FEE_DEDUCTED_FROM_AMOUNT") {
    return {
      model,
      requestedPb: formatScaled(amount, internal),
      feePb: formatScaled(fee, internal),
      senderPaysPb: formatScaled(amount, internal),
      recipientReceivesPb: formatScaled(amount - fee, internal),
      feeRateDecimal: TRANSFER_FEE_RATE_DECIMAL,
    };
  }
  return {
    model,
    requestedPb: formatScaled(amount, internal),
    feePb: formatScaled(fee, internal),
    senderPaysPb: formatScaled(amount + fee, internal),
    recipientReceivesPb: formatScaled(amount, internal),
    feeRateDecimal: TRANSFER_FEE_RATE_DECIMAL,
  };
}

/* ──────────── Política de comisiones en compras de tienda (§41) ──────────── */

/**
 * STORE_PURCHASE_FEE_POLICY: el checkout de la Official Store NO es una
 * transferencia entre usuarios, así que el 1% de transferencia NO se aplica
 * automáticamente a las compras. Nada se cobra dos veces.
 */
export const STORE_PURCHASE_FEE_POLICY = {
  id: "STORE_PURCHASE_FEE_POLICY" as const,
  version: 1,
  transferFeeAppliesToStorePurchases: false,
  rationale:
    "Una compra en la Official Store no constituye una transferencia entre usuarios; el 1% solo aplica a transferencias PB→PB explícitas.",
};

/* ───────────────── Precio Official Store: VN = VA × 0.90 (§35-§40) ───────────────── */

export const PRIMEBUILD_OFFICIAL_STORE_PB_DISCOUNT_V1 = {
  id: "PRIMEBUILD_OFFICIAL_STORE_PB_DISCOUNT_V1" as const,
  version: 1,
  /** Descuento inicial ≈10%, versionado y configurable (no siempre será 10%). */
  discountRateDecimal: "0.10" as const,
};

export type VaSource = "SHOPIFY_CURRENT_PRICE" | "OFFICIAL_STORE_LIST_PRICE" | "APPROVED_REFERENCE_PRICE";

export interface StorePriceInput {
  /** Valor actual de referencia en USD (VA). */
  vaUsd: string;
  /** Fuente declarada del VA — nunca un “precio anterior” falso. */
  vaSource: VaSource;
  /** Instante ISO del snapshot de VA. */
  vaObservedAt: string;
  /** Instante ISO del cálculo. */
  at: string;
  /** Política de descuento (por defecto la V1 del 10%). */
  discountRateDecimal?: string;
  discountPolicyId?: string;
  discountPolicyVersion?: number;
  pbDisplayDecimals?: number;
  directionConfiguration?: RateDirectionConfiguration;
}

export interface StorePriceSnapshot {
  policyId: string;
  policyVersion: number;
  vaUsd: string;
  vaSource: VaSource;
  vaObservedAt: string;
  discountRateDecimal: string;
  discountUsd: string;
  vnUsd: string;
  /** Ahorro = VA − VN (igual al descuento aplicado UNA sola vez). */
  savingsUsd: string;
  pbQuote: PbQuote;
  /** Precio principal en PB (presentación). */
  pbDisplay: string;
  at: string;
}

/**
 * Precio de la Official Store: VN = VA − (VA × descuento) = VA × 0.90 con la
 * política V1. El descuento se aplica UNA sola vez sobre el VA declarado y la
 * conversión a PB usa un quote del propio contrato (nunca un PB hardcodeado).
 */
export function calculateStorePrice(input: StorePriceInput): StorePriceSnapshot {
  const {
    vaUsd,
    vaSource,
    vaObservedAt,
    at,
    discountRateDecimal = PRIMEBUILD_OFFICIAL_STORE_PB_DISCOUNT_V1.discountRateDecimal,
    discountPolicyId = PRIMEBUILD_OFFICIAL_STORE_PB_DISCOUNT_V1.id,
    discountPolicyVersion = PRIMEBUILD_OFFICIAL_STORE_PB_DISCOUNT_V1.version,
    pbDisplayDecimals = PRECISION_POLICY.pbDisplayDecimalsDefault,
    directionConfiguration,
  } = input;

  const va = parseDecimal(vaUsd);
  if (va <= 0n) throw new PbExchangeMathError("VA debe ser positivo.");
  const rate = parseDecimal(discountRateDecimal);
  if (rate < 0n || rate >= ONE_SCALED) {
    throw new PbExchangeMathError("El descuento debe estar en [0, 1).");
  }
  const discount = mulScaled(va, rate);
  const vn = va - discount;

  // VN se fija a 2 decimales USD ANTES de cotizar PB para que el PB mostrado
  // corresponda exactamente al USD cobrado (sin doble redondeo divergente).
  const vnUsd2 = formatScaled(vn, PRECISION_POLICY.usdDecimals);
  const pbQuote = convertUsdToPb(vnUsd2, { at, pbDisplayDecimals, directionConfiguration });

  return {
    policyId: discountPolicyId,
    policyVersion: discountPolicyVersion,
    vaUsd: formatScaled(va, PRECISION_POLICY.usdDecimals),
    vaSource,
    vaObservedAt,
    discountRateDecimal,
    discountUsd: formatScaled(discount, PRECISION_POLICY.usdDecimals),
    vnUsd: vnUsd2,
    savingsUsd: formatScaled(discount, PRECISION_POLICY.usdDecimals),
    pbQuote,
    pbDisplay: pbQuote.netDisplay,
    at,
  };
}

/* ─────────────── Validador anti-arbitraje de ida y vuelta (§24) ─────────────── */

export interface RoundTripCycle {
  cycle: "USD_TO_PB_TO_USD" | "PB_TO_USD_TO_PB";
  startAmount: string;
  endAmount: string;
  /** end − start (positivo = ganancia garantizada sin riesgo). */
  delta: string;
  gainWithoutRisk: boolean;
}

export interface RoundTripValidation {
  interpretation: RateInterpretationId;
  rates: InterpretationRates;
  cycles: RoundTripCycle[];
  arbitrageExists: boolean;
  verdict: "SAFE" | "BLOCK_PRODUCTION_ACTIVATION";
}

export interface RoundTripValidatorInput {
  /** Importe de partida de la simulación (por defecto 1000 unidades). */
  startAmount?: string;
  /** Comisión de transferencia incluida en el ciclo (default: NO — comprar/vender no transfiere). */
  includeTransferFee?: boolean;
  /** Comisión del proveedor por operación, decimal (p.ej. "0.005"). */
  providerFeeRateDecimal?: string;
  /** Mínimo por operación (importes menores no operan y no pueden arbitrar). */
  minimumUsd?: string;
}

function simulateCycles(
  rates: InterpretationRates,
  input: RoundTripValidatorInput,
): RoundTripCycle[] {
  const start = parseDecimal(input.startAmount ?? "1000");
  if (start <= 0n) throw new PbExchangeMathError("El importe de simulación debe ser positivo.");
  const buyPbPerUsd = parseDecimal(rates.customerBuysPbPerUsd);
  const sellPbPerUsd = parseDecimal(rates.customerSellsPbPerUsd);
  const providerFee = input.providerFeeRateDecimal ? parseDecimal(input.providerFeeRateDecimal) : 0n;
  const transferFee = input.includeTransferFee ? TRANSFER_FEE_SCALED : 0n;
  const internal = PRECISION_POLICY.internalDecimals;

  const applyFees = (amount: bigint): bigint => {
    let out = amount;
    if (providerFee > 0n) out -= mulScaled(out, providerFee);
    if (transferFee > 0n) out -= mulScaled(out, transferFee);
    return out;
  };

  // USD → PB → USD (el cliente compra PB y lo vende de vuelta)
  const pbBought = applyFees(mulScaled(start, buyPbPerUsd));
  const usdBack = applyFees(divScaled(pbBought, sellPbPerUsd));

  // PB → USD → PB (el cliente vende PB y recompra)
  const usdFromSell = applyFees(divScaled(start, sellPbPerUsd));
  const pbBack = applyFees(mulScaled(usdFromSell, buyPbPerUsd));

  return [
    {
      cycle: "USD_TO_PB_TO_USD",
      startAmount: formatScaled(start, internal),
      endAmount: formatScaled(usdBack, internal),
      delta: formatScaled(usdBack - start, internal),
      gainWithoutRisk: usdBack > start,
    },
    {
      cycle: "PB_TO_USD_TO_PB",
      startAmount: formatScaled(start, internal),
      endAmount: formatScaled(pbBack, internal),
      delta: formatScaled(pbBack - start, internal),
      gainWithoutRisk: pbBack > start,
    },
  ];
}

/**
 * RoundTripArbitrageValidator: simula USD→PB→USD y PB→USD→PB bajo CADA
 * interpretación posible de las etiquetas. Si algún ciclo termina con más
 * valor garantizado sin riesgo, la activación de producción queda bloqueada
 * (BLOCK_PRODUCTION_ACTIVATION). El validador NUNCA cambia las tasas: la
 * dirección correcta la aprueba el propietario.
 */
export function validateRoundTrip(input: RoundTripValidatorInput = {}): {
  validations: RoundTripValidation[];
  blockProductionActivation: boolean;
  ownerApprovalRequired: true;
  summary: string;
} {
  const validations: RoundTripValidation[] = (
    ["CUSTOMER_PERSPECTIVE", "COINOS_PERSPECTIVE"] as RateInterpretationId[]
  ).map((interpretation) => {
    const rates = ratesForInterpretation(interpretation);
    const cycles = simulateCycles(rates, input);
    const arbitrageExists = cycles.some((c) => c.gainWithoutRisk);
    return {
      interpretation,
      rates,
      cycles,
      arbitrageExists,
      verdict: arbitrageExists ? "BLOCK_PRODUCTION_ACTIVATION" : "SAFE",
    };
  });

  const anyArbitrage = validations.some((v) => v.arbitrageExists);
  return {
    validations,
    blockProductionActivation: anyArbitrage,
    ownerApprovalRequired: true,
    summary: anyArbitrage
      ? "Al menos una interpretación de las tasas literales permite un ciclo con ganancia garantizada. La activación de dinero real queda bloqueada hasta que el propietario apruebe la dirección económica correcta."
      : "Ninguna interpretación permite ganancia garantizada sin riesgo con los parámetros simulados.",
  };
}

/* ───────────────────────────── Presentación ───────────────────────────── */

/** Formatea PB para UI: "1,234.56 PB" (separador de miles opcional). */
export function formatPb(
  pbAmount: string,
  opts: { decimals?: number; withCode?: boolean; thousands?: boolean } = {},
): string {
  const { decimals = PRECISION_POLICY.pbDisplayDecimalsDefault, withCode = true, thousands = true } = opts;
  const scaled = parseDecimal(pbAmount);
  let s = formatScaled(scaled, decimals);
  if (thousands) {
    const neg = s.startsWith("-");
    const body = neg ? s.slice(1) : s;
    const dot = body.indexOf(".");
    const intPart = dot === -1 ? body : body.slice(0, dot);
    const fracPart = dot === -1 ? "" : body.slice(dot);
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    s = `${neg ? "-" : ""}${grouped}${fracPart}`;
  }
  return withCode ? `${s} PB` : s;
}

/** Formatea USD para UI secundaria: "$12.34". */
export function formatUsd(usdAmount: string): string {
  const scaled = parseDecimal(usdAmount);
  const s = formatScaled(scaled, PRECISION_POLICY.usdDecimals);
  const neg = s.startsWith("-");
  const body = neg ? s.slice(1) : s;
  const dot = body.indexOf(".");
  const intPart = dot === -1 ? body : body.slice(0, dot);
  const fracPart = dot === -1 ? "00" : body.slice(dot + 1);
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${neg ? "-" : ""}$${grouped}.${fracPart}`;
}

/* ───────────────── Estados y eventos compartidos (§32, §73) ───────────────── */

export const PB_TRANSACTION_STATES = [
  "QUOTE_ONLY",
  "PENDING",
  "AUTHORIZED",
  "RESERVED",
  "SETTLED",
  "FAILED",
  "REVERSED",
  "CANCELLED",
  "UNKNOWN",
] as const;
export type PbTransactionState = (typeof PB_TRANSACTION_STATES)[number];

/** SETTLED exige evidencia del proveedor; sin providerRef es imposible. */
export function canMarkSettled(state: { providerRef?: string | null }): boolean {
  return Boolean(state.providerRef && state.providerRef.trim().length > 0);
}

export const PB_EXCHANGE_EVENTS = [
  "pb.quote_created",
  "pb.rate_changed",
  "pb.roundtrip_blocked",
  "pb.transfer_previewed",
  "pb.transaction_observed",
  "pb.store_price_created",
] as const;
export type PbExchangeEvent = (typeof PB_EXCHANGE_EVENTS)[number];

/** Nombres canónicos de feature flags del ecosistema (§85). */
export const PB_EXCHANGE_FLAGS = {
  pbExchangeV1Enabled: "pbExchangeV1Enabled",
  pbExchangeMoneyModeEnabled: "pbExchangeMoneyModeEnabled",
  pbTransferFeeEnabled: "pbTransferFeeEnabled",
  pbStorePricingEnabled: "pbStorePricingEnabled",
  crossAppPbExchangeEnabled: "crossAppPbExchangeEnabled",
} as const;
