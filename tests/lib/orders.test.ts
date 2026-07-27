import { describe, it, expect } from "vitest";
import {
  importOrder,
  importKey,
  maskCustomer,
  canReserve,
  type SalesOrderProjection,
} from "@/lib/orders";
import type { StoreOrder } from "@/server/integrations/store/store.service";

let c = 0;
const id = () => `o${++c}`;

const order: StoreOrder = {
  id: "gid://shopify/Order/1001",
  name: "#1001",
  createdAt: "2026-07-20T10:00:00Z",
  financialStatus: "PAID",
  fulfillmentStatus: "UNFULFILLED",
  total: "129.90",
  currency: "USD",
  customer: "Ana Pérez",
};

describe("sales orders (PBOS ORDEN 19)", () => {
  it("imports idempotently: a retry does not duplicate", () => {
    const first = importOrder(order, [], "t", id)!;
    expect(first.externalId).toBe(order.id);
    expect(first.idempotencyKey).toBe(importKey(order));
    expect(importOrder(order, [first], "t", id)).toBeNull();
  });

  it("keeps the lifecycles separate and payment observed-only", () => {
    const p = importOrder(order, [], "t", id)!;
    expect(p.orderStatus).toBe("nuevo");
    expect(p.paymentObserved).toBe("PAID");
    expect(p.reservationStatus).toBe("sin-reservar");
    expect(p.fulfillmentObserved).toBe("UNFULFILLED");
    expect(p.returnStatus).toBe("ninguna");
    expect(p.syncStatus).toBe("importado");
  });

  it("minimises customer data", () => {
    expect(maskCustomer("Ana Pérez")).toMatch(/Ana \*+/);
    expect(maskCustomer("ana@example.com")).toMatch(/an\*\*\*@example\.com/);
    expect(maskCustomer(null)).toBeNull();
  });

  it("blocks reservation without a policy", () => {
    expect(canReserve(false).ok).toBe(false);
    expect(canReserve(false).reason).toMatch(/Política de reserva/);
    expect(canReserve(true).ok).toBe(true);
  });

  it("does not touch an unrelated projection on import", () => {
    const other: SalesOrderProjection = importOrder(
      { ...order, id: "gid://shopify/Order/2002", name: "#2002" },
      [],
      "t",
      id,
    )!;
    expect(importOrder(order, [other], "t", id)).not.toBeNull(); // different key → imports
  });
});
