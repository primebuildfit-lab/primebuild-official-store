import { describe, it, expect } from "vitest";
import { aggregateLocalCustomers, canMassExport } from "@/lib/customers";
import type { SalesOrderProjection } from "@/lib/orders";
import type { SalesReturn } from "@/lib/returns";

const order = (over: Partial<SalesOrderProjection>): SalesOrderProjection => ({
  id: over.id ?? "o1",
  source: "shopify",
  externalId: "e",
  idempotencyKey: "k",
  correlationId: "k",
  name: "#1",
  observedAt: over.observedAt ?? "2026-07-20T00:00:00Z",
  currency: "USD",
  totalObserved: "10",
  customerMasked: over.customerMasked ?? "Ana ****",
  orderStatus: "nuevo",
  paymentObserved: "PAID",
  reservationStatus: "sin-reservar",
  fulfillmentObserved: "UNFULFILLED",
  returnStatus: "ninguna",
  syncStatus: "importado",
  notes: [],
  history: [],
  lastVerifiedAt: "",
});

describe("customers projection (PBOS ORDEN 22)", () => {
  it("aggregates by masked label; counts orders and returns; no raw contact", () => {
    const orders = [
      order({ id: "o1", customerMasked: "Ana ****" }),
      order({ id: "o2", customerMasked: "Ana ****" }),
      order({ id: "o3", customerMasked: "Beto ****" }),
    ];
    const returns = [{ id: "r1", orderId: "o1" } as SalesReturn];
    const result = aggregateLocalCustomers(orders, returns);
    const ana = result.find((c) => c.key === "Ana ****")!;
    expect(ana.orders).toBe(2);
    expect(ana.returns).toBe(1);
    expect(result.find((c) => c.key === "Beto ****")!.orders).toBe(1);
    // Contact stays masked (already-masked label carried through).
    expect(ana.contactMasked).toBe("Ana ****");
  });

  it("blocks mass export without capability", () => {
    expect(canMassExport(false).ok).toBe(false);
    expect(canMassExport(false).reason).toMatch(/Exportación masiva/);
    expect(canMassExport(true).ok).toBe(true);
  });
});
