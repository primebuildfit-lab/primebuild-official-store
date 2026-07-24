import { describe, it, expect } from "vitest";
import {
  PB_EXCHANGE_PROFILE_ID,
  PB_LEGACY_PROFILE_ID,
  PB_EXCHANGE_SDK_VERSION,
  PB_VALUE_PROFILES,
  BUY_RATE_LABEL,
  SELL_RATE_LABEL,
  PI_RATE,
  SELL_RATE,
  TRANSFER_FEE_RATE,
  PI_DECIMAL,
  SELL_RATE_DECIMAL,
  TRANSFER_FEE_RATE_DECIMAL,
  parseDecimal,
  formatScaled,
  mulScaled,
  divScaled,
  PbExchangeMathError,
  ratesForInterpretation,
  DEFAULT_RATE_DIRECTION_CONFIGURATION,
  getProviderState,
  buildRateSnapshot,
  getQuote,
  convertUsdToPb,
  convertPbToUsd,
  isQuoteExpired,
  calculateTransferFee,
  DEFAULT_TRANSFER_FEE_MODEL,
  STORE_PURCHASE_FEE_POLICY,
  PRIMEBUILD_OFFICIAL_STORE_PB_DISCOUNT_V1,
  calculateStorePrice,
  validateRoundTrip,
  formatPb,
  formatUsd,
  PB_TRANSACTION_STATES,
  canMarkSettled,
  PB_EXCHANGE_EVENTS,
  PB_EXCHANGE_FLAGS,
} from "@/lib/pb-exchange/pb-exchange-sdk";

const AT = "2026-07-23T12:00:00.000Z";

describe("PB_EXCHANGE_V1 — identidad y perfiles duales", () => {
  it("expone los dos perfiles separados y el legado intocable", () => {
    expect(PB_EXCHANGE_PROFILE_ID).toBe("PB_EXCHANGE_V1");
    expect(PB_LEGACY_PROFILE_ID).toBe("PB_LEGACY_POINTS");
    expect(PB_VALUE_PROFILES.PB_LEGACY_POINTS.mutableFromSdk).toBe(false);
    expect(PB_VALUE_PROFILES.PB_EXCHANGE_V1.mutableFromSdk).toBe(false);
    expect(PB_EXCHANGE_SDK_VERSION).toBe("1.0.0");
  });

  it("guarda las etiquetas EXACTAS del propietario", () => {
    expect(BUY_RATE_LABEL).toBe("1 USD = π PB");
    expect(SELL_RATE_LABEL).toBe("1 USD = 3.1 PB");
  });
});

describe("π — precisión (§22)", () => {
  it("π nunca es 3.14: la fuente decimal lleva 36 decimales", () => {
    expect(PI_DECIMAL).not.toBe("3.14");
    expect(PI_DECIMAL.length).toBeGreaterThan(30);
    expect(PI_DECIMAL.startsWith("3.14159265358979323846")).toBe(true);
  });

  it("la constante de referencia Math.PI es coherente con la fuente decimal", () => {
    expect(PI_RATE).toBe(Math.PI);
    // Los 16 dígitos significativos del double coinciden con el decimal largo.
    expect(PI_DECIMAL.startsWith(String(Math.PI).slice(0, 16))).toBe(true);
    expect(SELL_RATE).toBe(3.1);
    expect(TRANSFER_FEE_RATE).toBe(0.01);
    expect(SELL_RATE_DECIMAL).toBe("3.1");
    expect(TRANSFER_FEE_RATE_DECIMAL).toBe("0.01");
  });
});

describe("aritmética decimal exacta", () => {
  it("parsea y formatea con redondeo half-up", () => {
    expect(parseDecimal("1")).toBe(10n ** 12n);
    expect(parseDecimal("0.0000000000005")).toBe(1n); // dígito 13 = 5 → sube
    expect(parseDecimal("0.0000000000004")).toBe(0n);
    expect(formatScaled(parseDecimal("1.005"), 2)).toBe("1.01");
    expect(formatScaled(parseDecimal("1.004"), 2)).toBe("1.00");
    expect(formatScaled(parseDecimal("-1.005"), 2)).toBe("-1.01");
  });

  it("rechaza entradas no decimales", () => {
    expect(() => parseDecimal("abc")).toThrow(PbExchangeMathError);
    expect(() => parseDecimal("1,5")).toThrow(PbExchangeMathError);
    expect(() => divScaled(1n, 0n)).toThrow(PbExchangeMathError);
  });

  it("multiplica y divide sin flotantes", () => {
    const two = parseDecimal("2");
    const three = parseDecimal("3");
    expect(formatScaled(mulScaled(two, three), 2)).toBe("6.00");
    expect(formatScaled(divScaled(two, three), 12)).toBe("0.666666666667");
  });
});

describe("cotizaciones (§21, §36)", () => {
  it("USD→PB usa π: 1 USD ≈ 3.141592653590 PB interno, 3.14 PB en display", () => {
    const q = convertUsdToPb("1", { at: AT });
    expect(q.grossAmount).toBe("3.141592653590");
    expect(q.netDisplay).toBe("3.14");
    expect(q.rateUsed.label).toBe(BUY_RATE_LABEL);
    expect(q.rateUsed.decimal).toBe(PI_DECIMAL);
    expect(q.status).toBe("QUOTE_ONLY");
  });

  it("PB→USD usa 3.1: 3.1 PB = 1.00 USD", () => {
    const q = convertPbToUsd("3.1", { at: AT });
    expect(q.netDisplay).toBe("1.00");
    expect(q.rateUsed.label).toBe(SELL_RATE_LABEL);
  });

  it("advierte dirección pendiente y modo cotización mientras el propietario no decida", () => {
    const q = getQuote({ direction: "USD_TO_PB", amount: "10", at: AT });
    expect(q.warnings).toContain("DIRECTION_INTERPRETATION_PENDING");
    expect(q.warnings).toContain("QUOTE_TEST_ONLY");
    expect(q.warnings).toContain("PROVIDER_NOT_CONNECTED");
    expect(q.snapshot.directionConfiguration.status).toBe("OWNER_DECISION_PENDING");
  });

  it("no aplica el 1% de transferencia a un quote salvo petición explícita", () => {
    const plain = getQuote({ direction: "USD_TO_PB", amount: "100", at: AT });
    expect(plain.transferFee).toBe("0.000000000000");
    const withFee = getQuote({ direction: "USD_TO_PB", amount: "100", at: AT, includeTransferFee: true });
    expect(parseFloat(withFee.transferFee)).toBeGreaterThan(0);
  });

  it("nunca inventa comisión de proveedor", () => {
    const q = getQuote({ direction: "USD_TO_PB", amount: "50", at: AT });
    expect(q.providerFee).toBe("0.000000000000");
  });

  it("rechaza importes no positivos", () => {
    expect(() => getQuote({ direction: "USD_TO_PB", amount: "0", at: AT })).toThrow();
    expect(() => getQuote({ direction: "USD_TO_PB", amount: "-5", at: AT })).toThrow();
  });

  it("caduca por expiresAt con reloj del llamador", () => {
    const q = getQuote({
      direction: "USD_TO_PB",
      amount: "1",
      at: AT,
      expiresAt: "2026-07-23T12:15:00.000Z",
    });
    expect(isQuoteExpired(q, "2026-07-23T12:10:00.000Z")).toBe(false);
    expect(isQuoteExpired(q, "2026-07-23T12:16:00.000Z")).toBe(true);
    const eternal = getQuote({ direction: "USD_TO_PB", amount: "1", at: AT });
    expect(isQuoteExpired(eternal, "2099-01-01T00:00:00.000Z")).toBe(false);
  });

  it("el snapshot conserva contrato, versión, etiquetas y dirección", () => {
    const s = buildRateSnapshot(AT);
    expect(s.contract).toBe("PB_EXCHANGE_V1");
    expect(s.sdkVersion).toBe(PB_EXCHANGE_SDK_VERSION);
    expect(s.buyRateLabel).toBe(BUY_RATE_LABEL);
    expect(s.piDecimal).toBe(PI_DECIMAL);
    expect(s.at).toBe(AT);
  });
});

describe("comisión de transferencia 1% (§25-§26)", () => {
  it("FEE_DEDUCTED: envía 100 → fee 1 → recibe 99", () => {
    const t = calculateTransferFee("100", "FEE_DEDUCTED_FROM_AMOUNT");
    expect(formatScaled(parseDecimal(t.feePb), 2)).toBe("1.00");
    expect(formatScaled(parseDecimal(t.senderPaysPb), 2)).toBe("100.00");
    expect(formatScaled(parseDecimal(t.recipientReceivesPb), 2)).toBe("99.00");
  });

  it("FEE_ADDED (default recomendado): recibe 100 → fee 1 → paga 101", () => {
    expect(DEFAULT_TRANSFER_FEE_MODEL).toBe("FEE_ADDED_TO_SENDER");
    const t = calculateTransferFee("100");
    expect(formatScaled(parseDecimal(t.feePb), 2)).toBe("1.00");
    expect(formatScaled(parseDecimal(t.senderPaysPb), 2)).toBe("101.00");
    expect(formatScaled(parseDecimal(t.recipientReceivesPb), 2)).toBe("100.00");
  });

  it("la comisión nunca se oculta: siempre viaja desglosada", () => {
    const t = calculateTransferFee("42.42");
    expect(t.feeRateDecimal).toBe("0.01");
    expect(t.feePb).not.toBe("");
  });

  it("rechaza transferencias no positivas", () => {
    expect(() => calculateTransferFee("0")).toThrow();
  });
});

describe("STORE_PURCHASE_FEE_POLICY (§41)", () => {
  it("el checkout de tienda NO es transferencia: el 1% no se aplica automático", () => {
    expect(STORE_PURCHASE_FEE_POLICY.transferFeeAppliesToStorePurchases).toBe(false);
  });
});

describe("precio Official Store VN = VA × 0.90 (§35-§40)", () => {
  it("VA=100 → VN=90.00, ahorro 10.00, PB = quote de 90 (nunca hardcodeado)", () => {
    const s = calculateStorePrice({
      vaUsd: "100",
      vaSource: "SHOPIFY_CURRENT_PRICE",
      vaObservedAt: AT,
      at: AT,
    });
    expect(s.vnUsd).toBe("90.00");
    expect(s.discountUsd).toBe("10.00");
    expect(s.savingsUsd).toBe("10.00");
    expect(s.policyId).toBe("PRIMEBUILD_OFFICIAL_STORE_PB_DISCOUNT_V1");
    // 90 × π(12 dec) = 90 × 3.141592653590 — π se redondea UNA vez a precisión interna.
    expect(s.pbQuote.grossAmount).toBe("282.743338823100");
    expect(s.pbDisplay).toBe("282.74");
  });

  it("el descuento se aplica UNA sola vez (90, no 81)", () => {
    const s = calculateStorePrice({
      vaUsd: "100",
      vaSource: "APPROVED_REFERENCE_PRICE",
      vaObservedAt: AT,
      at: AT,
    });
    expect(s.vnUsd).toBe("90.00");
    expect(s.vnUsd).not.toBe("81.00");
  });

  it("la política es versionada y configurable (no siempre 10%)", () => {
    expect(PRIMEBUILD_OFFICIAL_STORE_PB_DISCOUNT_V1.version).toBe(1);
    const s = calculateStorePrice({
      vaUsd: "200",
      vaSource: "OFFICIAL_STORE_LIST_PRICE",
      vaObservedAt: AT,
      at: AT,
      discountRateDecimal: "0.05",
      discountPolicyVersion: 2,
    });
    expect(s.vnUsd).toBe("190.00");
    expect(s.policyVersion).toBe(2);
  });

  it("VA exige fuente declarada y timestamp", () => {
    const s = calculateStorePrice({
      vaUsd: "59.99",
      vaSource: "SHOPIFY_CURRENT_PRICE",
      vaObservedAt: "2026-07-23T09:00:00.000Z",
      at: AT,
    });
    expect(s.vaSource).toBe("SHOPIFY_CURRENT_PRICE");
    expect(s.vaObservedAt).toBe("2026-07-23T09:00:00.000Z");
    expect(s.vnUsd).toBe("53.99"); // 59.99 × 0.9 = 53.991 → 53.99
  });

  it("rechaza VA no positivo y descuentos fuera de [0,1)", () => {
    expect(() =>
      calculateStorePrice({ vaUsd: "0", vaSource: "SHOPIFY_CURRENT_PRICE", vaObservedAt: AT, at: AT }),
    ).toThrow();
    expect(() =>
      calculateStorePrice({
        vaUsd: "10",
        vaSource: "SHOPIFY_CURRENT_PRICE",
        vaObservedAt: AT,
        at: AT,
        discountRateDecimal: "1",
      }),
    ).toThrow();
  });
});

describe("anti-arbitraje (§24)", () => {
  it("con las etiquetas literales leídas desde el cliente existe arbitraje y se bloquea producción", () => {
    const r = validateRoundTrip();
    const customer = r.validations.find((v) => v.interpretation === "CUSTOMER_PERSPECTIVE")!;
    expect(customer.arbitrageExists).toBe(true);
    expect(customer.verdict).toBe("BLOCK_PRODUCTION_ACTIVATION");
    const usdCycle = customer.cycles.find((c) => c.cycle === "USD_TO_PB_TO_USD")!;
    // 1000 USD → 1000π PB → /3.1 ≈ 1013.42 USD: ganancia garantizada.
    expect(usdCycle.gainWithoutRisk).toBe(true);
    expect(parseFloat(usdCycle.endAmount)).toBeCloseTo(1013.42, 1);
    expect(r.blockProductionActivation).toBe(true);
    expect(r.ownerApprovalRequired).toBe(true);
  });

  it("leídas desde CoinOS no hay arbitraje (spread a favor de la casa)", () => {
    const r = validateRoundTrip();
    const coinos = r.validations.find((v) => v.interpretation === "COINOS_PERSPECTIVE")!;
    expect(coinos.arbitrageExists).toBe(false);
    expect(coinos.verdict).toBe("SAFE");
    for (const c of coinos.cycles) expect(c.gainWithoutRisk).toBe(false);
  });

  it("una comisión de proveedor suficiente elimina el arbitraje del ciclo cliente", () => {
    const r = validateRoundTrip({ providerFeeRateDecimal: "0.02" });
    const customer = r.validations.find((v) => v.interpretation === "CUSTOMER_PERSPECTIVE")!;
    expect(customer.arbitrageExists).toBe(false);
    expect(r.blockProductionActivation).toBe(false);
  });

  it("el validador no cambia tasas: solo simula y bloquea", () => {
    const r = validateRoundTrip();
    expect(r.summary).toContain("propietario");
    // Las tasas de cada interpretación siguen siendo las literales.
    const rates = ratesForInterpretation("CUSTOMER_PERSPECTIVE");
    expect(rates.customerBuysPbPerUsd).toBe(PI_DECIMAL);
    expect(rates.customerSellsPbPerUsd).toBe("3.1");
  });
});

describe("estado del proveedor (§28)", () => {
  it("por defecto: sin proveedor, modo cotización, sin fuente financiera", () => {
    const s = getProviderState();
    expect(s.state).toBe("provider_not_connected");
    expect(s.mode).toBe("QUOTE_TEST_ONLY");
    expect(s.financialSourceOfTruth).toBeNull();
  });

  it("LIVE exige todas las puertas a la vez", () => {
    expect(getProviderState({ providerConfigured: true }).mode).toBe("QUOTE_TEST_ONLY");
    expect(getProviderState({ providerConfigured: true, providerVerified: true }).mode).toBe(
      "QUOTE_TEST_ONLY",
    );
    const live = getProviderState({
      providerConfigured: true,
      providerVerified: true,
      moneyModeEnabled: true,
      ownerDirectionApproved: true,
      arbitrageBlocked: false,
    });
    expect(live.mode).toBe("LIVE");
    expect(live.financialSourceOfTruth).toBe("PROVIDER_LEDGER");
  });
});

describe("estados de transacción y eventos (§32, §73)", () => {
  it("expone los 9 estados y nunca SETTLED sin evidencia del proveedor", () => {
    expect(PB_TRANSACTION_STATES).toHaveLength(9);
    expect(PB_TRANSACTION_STATES).toContain("SETTLED");
    expect(canMarkSettled({})).toBe(false);
    expect(canMarkSettled({ providerRef: "" })).toBe(false);
    expect(canMarkSettled({ providerRef: "prov_123" })).toBe(true);
  });

  it("eventos idempotentes versionados con nombres canónicos", () => {
    expect(PB_EXCHANGE_EVENTS).toContain("pb.quote_created");
    expect(PB_EXCHANGE_EVENTS).toContain("pb.roundtrip_blocked");
    expect(PB_EXCHANGE_EVENTS).toContain("pb.store_price_created");
  });

  it("nombres canónicos de flags compartidos", () => {
    expect(PB_EXCHANGE_FLAGS.pbExchangeMoneyModeEnabled).toBe("pbExchangeMoneyModeEnabled");
  });
});

describe("presentación", () => {
  it("formatPb y formatUsd", () => {
    expect(formatPb("1234.567")).toBe("1,234.57 PB");
    expect(formatPb("1234.567", { withCode: false, decimals: 1 })).toBe("1,234.6");
    expect(formatUsd("1234.5")).toBe("$1,234.50");
  });
});

describe("dirección económica sin inferencia silenciosa (§23)", () => {
  it("la configuración nace sin decidir", () => {
    expect(DEFAULT_RATE_DIRECTION_CONFIGURATION.configured).toBe(false);
    expect(DEFAULT_RATE_DIRECTION_CONFIGURATION.status).toBe("OWNER_DECISION_PENDING");
  });

  it("cada interpretación deriva SOLO de las etiquetas literales", () => {
    const customer = ratesForInterpretation("CUSTOMER_PERSPECTIVE");
    const coinos = ratesForInterpretation("COINOS_PERSPECTIVE");
    expect(customer.customerBuysPbPerUsd).toBe(PI_DECIMAL);
    expect(coinos.customerBuysPbPerUsd).toBe("3.1");
    expect(coinos.customerSellsPbPerUsd).toBe(PI_DECIMAL);
  });
});
