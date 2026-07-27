import { describe, it, expect } from "vitest";
import {
  canTransition,
  orderSubtotal,
  orderTotal,
  canDelete,
  canChangeCurrency,
  type POLine,
  type PurchaseOrder,
} from "@/lib/purchase-orders";

const lines: POLine[] = [
  { id: "1", sku: "A", qty: 10, unit: "caja", unitPrice: 5 },
  { id: "2", sku: "B", qty: 3, unit: "unidad", unitPrice: null },
];

describe("purchase-order lifecycle (PBOS ORDEN 9)", () => {
  it("allows only real transitions and forbids skipping states", () => {
    expect(canTransition("borrador", "en-revision")).toBe(true);
    expect(canTransition("en-revision", "aprobada")).toBe(true);
    // Cannot jump draft straight to issued/received.
    expect(canTransition("borrador", "emitida")).toBe(false);
    expect(canTransition("aprobada", "recibida")).toBe(false);
    // Terminal states go nowhere.
    expect(canTransition("cerrada", "borrador")).toBe(false);
    expect(canTransition("cancelada", "borrador")).toBe(false);
  });

  it("totals only known prices and counts the rest, plus additional costs", () => {
    const sub = orderSubtotal(lines);
    expect(sub.subtotal).toBe(50);
    expect(sub.linesWithoutPrice).toBe(1);
    expect(orderTotal({ lines, additionalCosts: 12 })).toBe(62);
  });

  it("only deletes / re-currencies a pristine draft", () => {
    const draft: Pick<PurchaseOrder, "status" | "history"> = {
      status: "borrador",
      history: [{ at: "", actor: "op", from: null, to: "borrador", reason: "creada" }],
    };
    expect(canDelete(draft)).toBe(true);
    expect(canChangeCurrency(draft)).toBe(true);

    const active: Pick<PurchaseOrder, "status" | "history"> = {
      status: "aprobada",
      history: [
        { at: "", actor: "op", from: null, to: "borrador", reason: "creada" },
        { at: "", actor: "op", from: "en-revision", to: "aprobada", reason: "ok" },
      ],
    };
    expect(canDelete(active)).toBe(false);
    expect(canChangeCurrency(active)).toBe(false);
  });
});
