import { describe, it, expect } from "vitest";
import {
  canFulfillmentTransition,
  lineShortage,
  hasShortages,
  shippingStage,
  REMOTE_SHIPMENT_ALLOWED,
  type Fulfillment,
} from "@/lib/fulfillment";

const base = (over: Partial<Fulfillment>): Fulfillment => ({
  id: "f1",
  code: "FL-0001",
  orderId: "o1",
  orderName: "#1001",
  warehouse: "WH-01",
  status: "picking",
  lines: [{ id: "l", sku: "A", required: 5, picked: 3 }],
  shippedLocally: false,
  remoteConfirmed: false,
  history: [],
  source: "local",
  version: 1,
  ...over,
});

describe("fulfillment (PBOS ORDEN 20)", () => {
  it("forbids skipping states", () => {
    expect(canFulfillmentTransition("picking", "preparado")).toBe(true);
    expect(canFulfillmentTransition("pendiente", "enviado")).toBe(false);
    expect(canFulfillmentTransition("completado", "picking")).toBe(false);
  });

  it("computes shortages", () => {
    expect(lineShortage({ id: "l", sku: "A", required: 5, picked: 3 })).toBe(2);
    expect(hasShortages(base({}))).toBe(true);
    expect(hasShortages(base({ lines: [{ id: "l", sku: "A", required: 5, picked: 5 }] }))).toBe(
      false,
    );
  });

  it("keeps shipping stages distinct and blocks remote confirmation", () => {
    expect(REMOTE_SHIPMENT_ALLOWED).toBe(false);
    expect(shippingStage(base({}))).toBe("preparado-local"); // a local mark is not shipped
    expect(shippingStage(base({ labelObserved: "L1" }))).toBe("etiqueta-observada");
    expect(shippingStage(base({ trackingObserved: "T1" }))).toBe("entregado-transportista");
    expect(shippingStage(base({ remoteConfirmed: true }))).toBe("confirmado-integracion");
  });
});
