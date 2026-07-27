import { describe, expect, it } from "vitest";
import { computeVariantPrice, checkoutFeeBreakdown, revalidatePriceQuote } from "@/lib/store-pricing";
import type { OfficialVariant, PrimeBuildOfficialProduct } from "@/lib/official-products";
import {
  createOrderDraft,
  nextCheckoutStep,
  orderTotals,
  transitionOrder,
  validateCartQuantities,
  OFFICIAL_ORDER_STATES,
  type CartLine,
  type PrimeBuildOfficialOrder,
} from "@/lib/storefront";

const NOW = "2026-07-23T12:00:00.000Z";
let seq = 0;
const makeId = () => `id_${++seq}`;

function product(): PrimeBuildOfficialProduct {
  return {
    id: "prod-1",
    title: "PrimeBuild™ Belt",
    handle: "belt",
    vendor: "PrimeBuild",
    tags: [],
    collections: [],
    mediaUrls: [],
    options: [],
    variants: [variant()],
    status: "ready",
    officialStoreEligible: true,
    fastShipping: { warehouseAssigned: false, carrierServiceAvailable: false, cutoffDefined: false, slaRegistered: false },
    source: { type: "manual", createdAt: NOW },
    createdAt: NOW,
    updatedAt: NOW,
    version: 1,
  };
}

function variant(partial: Partial<OfficialVariant> = {}): OfficialVariant {
  return {
    id: "var-1",
    title: "Black / L",
    sku: "SKU-L",
    vaUsd: "100",
    vaSource: "SHOPIFY_CURRENT_PRICE",
    vaObservedAt: NOW,
    ...partial,
  };
}

describe("precio principal PB (§35-§37)", () => {
  it("VA=100 → VN=90.00 y PB por quote del contrato (nunca hardcodeado)", () => {
    const r = computeVariantPrice(product(), variant(), NOW, makeId);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.quote.snapshot.vnUsd).toBe("90.00");
      expect(r.quote.snapshot.savingsUsd).toBe("10.00");
      expect(r.quote.snapshot.pbDisplay).toBe("282.74");
      expect(r.quote.snapshot.policyId).toBe("PRIMEBUILD_OFFICIAL_STORE_PB_DISCOUNT_V1");
      expect(r.quote.expiresAt > NOW).toBe(true);
    }
  });

  it("sin VA con fuente declarada NO hay precio (jamás inventado)", () => {
    const r = computeVariantPrice(product(), variant({ vaUsd: undefined }), NOW, makeId);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("NO_VA");
  });
});

describe("revalidación de quote en checkout (§38)", () => {
  it("quote vigente + VA sin cambios ⇒ sigue válido", () => {
    const r = computeVariantPrice(product(), variant(), NOW, makeId);
    if (!r.ok) throw new Error("quote esperado");
    const v = revalidatePriceQuote(r.quote, variant(), "2026-07-23T12:10:00.000Z");
    expect(v.stillValid).toBe(true);
  });

  it("quote caducado exige reconfirmación con snapshot fresco", () => {
    const r = computeVariantPrice(product(), variant(), NOW, makeId);
    if (!r.ok) throw new Error("quote esperado");
    const v = revalidatePriceQuote(r.quote, variant(), "2026-07-23T13:01:00.000Z");
    expect(v.stillValid).toBe(false);
    expect(v.changes.some((c) => c.includes("caducó"))).toBe(true);
    expect(v.freshSnapshot?.vnUsd).toBe("90.00");
  });

  it("cambio de VA se muestra, nunca se cobra en silencio", () => {
    const r = computeVariantPrice(product(), variant(), NOW, makeId);
    if (!r.ok) throw new Error("quote esperado");
    const v = revalidatePriceQuote(r.quote, variant({ vaUsd: "120" }), "2026-07-23T12:05:00.000Z");
    expect(v.stillValid).toBe(false);
    expect(v.freshSnapshot?.vnUsd).toBe("108.00");
  });
});

describe("desglose de checkout (§41)", () => {
  it("separa conceptos; 1% de transferencia = 0 en compras; nada desconocido se pone a 0", () => {
    const b = checkoutFeeBreakdown({ itemsVaTotalUsd: "200.00", itemsVnTotalUsd: "180.00" });
    expect(b.itemsUsd).toBe("180.00");
    expect(b.storeDiscountUsd).toBe("20.00");
    expect(b.transferFeeUsd).toBe("0.00");
    expect(b.providerFee).toBe("unknown_no_provider");
    expect(b.shippingUsd).toBe("not_quoted");
    expect(b.taxesUsd).toBe("not_quoted");
    expect(b.totalUsd).toBe("pending_shipping_and_taxes");
    expect(b.policy.transferFeeAppliesToStorePurchases).toBe(false);
  });

  it("con envío e impuestos cotizados calcula el total", () => {
    const b = checkoutFeeBreakdown({
      itemsVaTotalUsd: "100.00",
      itemsVnTotalUsd: "90.00",
      shippingUsd: "5.00",
      taxesUsd: "2.50",
    });
    expect(b.totalUsd).toBe("97.50");
  });
});

describe("carrito y cantidades (§45)", () => {
  function line(partial: Partial<CartLine> = {}): CartLine {
    const r = computeVariantPrice(product(), variant(), NOW, makeId);
    if (!r.ok) throw new Error("quote");
    return {
      id: makeId(),
      productId: "prod-1",
      variantId: "var-1",
      title: "Belt",
      variantTitle: "Black / L",
      sku: "SKU-L",
      warehouseId: "alm-1",
      quantity: 2,
      priceQuote: r.quote,
      addedAt: NOW,
      ...partial,
    };
  }

  it("acepta cantidades dentro del disponible y rechaza por encima (suma por SKU)", () => {
    const availability = (key: string) => (key === "SKU-L" ? 5 : 0);
    expect(validateCartQuantities([line({ quantity: 3 }), line({ quantity: 2 })], availability)).toHaveLength(0);
    const issues = validateCartQuantities([line({ quantity: 3 }), line({ quantity: 3 })], availability);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.kind).toBe("OVER_AVAILABLE");
  });
});

describe("pedidos: estados y evidencia (§46, §48)", () => {
  it("los 13 estados existen y el checkout avanza en orden", () => {
    expect(OFFICIAL_ORDER_STATES).toHaveLength(13);
    expect(nextCheckoutStep("cart")).toBe("inventory_validation");
    expect(nextCheckoutStep("confirmation")).toBeNull();
  });

  function draft(): PrimeBuildOfficialOrder {
    return createOrderDraft({ items: [], paymentChoice: "PB" }, NOW, makeId);
  }

  it("no se marca Paid observed sin evidencia", () => {
    let o = draft();
    const t1 = transitionOrder(o, "Awaiting payment", "t", NOW);
    if (!t1.ok) throw new Error("transición esperada");
    o = t1.order;
    const noEvidence = transitionOrder(o, "Paid observed", "t", NOW);
    expect(noEvidence.ok).toBe(false);
    if (!noEvidence.ok) expect(noEvidence.reason).toBe("EVIDENCE_REQUIRED");
    const withEvidence = transitionOrder(o, "Paid observed", "t", NOW, {
      reference: "obs-123",
      observedAt: NOW,
      method: "USD",
    });
    expect(withEvidence.ok).toBe(true);
  });

  it("prohíbe transiciones ilegales y registra historial", () => {
    const o = draft();
    expect(transitionOrder(o, "Shipped", "t", NOW).ok).toBe(false);
    const t = transitionOrder(o, "Awaiting payment", "t", NOW);
    if (t.ok) {
      expect(t.order.history).toHaveLength(1);
      expect(t.order.history[0]!.from).toBe("Draft");
    }
  });

  it("Refund observed exige evidencia también", () => {
    let o = draft();
    for (const [to, ev] of [
      ["Awaiting payment", undefined],
      ["Paid observed", { reference: "p", observedAt: NOW, method: "USD" as const }],
      ["Picking", undefined],
      ["Packed", undefined],
      ["Shipped", undefined],
      ["Delivered", undefined],
      ["Return requested", undefined],
      ["Returned", undefined],
    ] as const) {
      const r = transitionOrder(o, to, "t", NOW, ev);
      if (!r.ok) throw new Error(`fallo en ${to}: ${r.detail}`);
      o = r.order;
    }
    expect(transitionOrder(o, "Refund observed", "t", NOW).ok).toBe(false);
    expect(
      transitionOrder(o, "Refund observed", "t", NOW, { reference: "ref-9", observedAt: NOW, method: "USD" }).ok,
    ).toBe(true);
  });
});

describe("totales del pedido", () => {
  it("suma snapshots sin recalcular tasas", () => {
    const r = computeVariantPrice(product(), variant(), NOW, makeId);
    if (!r.ok) throw new Error("quote");
    const totals = orderTotals([
      {
        id: "i1",
        productId: "prod-1",
        variantId: "var-1",
        title: "Belt",
        variantTitle: "Black / L",
        sku: "SKU-L",
        warehouseId: "alm-1",
        quantity: 2,
        priceQuote: r.quote,
      },
    ]);
    expect(totals.itemsCount).toBe(2);
    expect(totals.vaTotalUsd).toBe("200.00");
    expect(totals.vnTotalUsd).toBe("180.00");
    expect(totals.savingsUsd).toBe("20.00");
    expect(totals.pbTotalDisplay).toBe("565.48"); // 2 × 282.74
  });
});
