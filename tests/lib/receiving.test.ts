import { describe, it, expect } from "vitest";
import {
  classifyLine,
  receiptDiscrepant,
  soundReceived,
  receivedSoFar,
  pendingFor,
  totalsByCondition,
  type Receipt,
  type ReceiptLine,
} from "@/lib/receiving";

const line = (p: Partial<ReceiptLine>): ReceiptLine => ({
  id: p.id ?? "l",
  sku: p.sku ?? "A",
  expected: p.expected ?? 10,
  received: p.received ?? 10,
  condition: p.condition ?? "ok",
  location: p.location,
  lot: p.lot,
});

describe("receiving (PBOS ORDEN 10)", () => {
  it("classifies short / over / complete lines", () => {
    expect(classifyLine({ expected: 10, received: 4 })).toBe("faltante");
    expect(classifyLine({ expected: 10, received: 12 })).toBe("exceso");
    expect(classifyLine({ expected: 10, received: 10 })).toBe("completa");
  });

  it("flags a receipt discrepant when quantity differs or condition is not ok", () => {
    expect(receiptDiscrepant([line({})])).toBe(false);
    expect(receiptDiscrepant([line({ received: 8 })])).toBe(true);
    expect(receiptDiscrepant([line({ condition: "dañado" })])).toBe(true);
  });

  it("never counts damaged or quarantined goods as sound/available", () => {
    expect(soundReceived({ received: 5, condition: "ok" })).toBe(5);
    expect(soundReceived({ received: 5, condition: "dañado" })).toBe(0);
    expect(soundReceived({ received: 5, condition: "cuarentena" })).toBe(0);
  });

  it("accumulates prior receipts and computes pending for partial receiving", () => {
    const receipts: Receipt[] = [
      {
        id: "r1",
        poId: "po1",
        poNumber: "OC-0001",
        warehouse: "P",
        status: "parcial",
        createdAt: "",
        lines: [line({ sku: "A", received: 4 })],
      },
      {
        id: "r2",
        poId: "po1",
        poNumber: "OC-0001",
        warehouse: "P",
        status: "cancelada",
        createdAt: "",
        lines: [line({ sku: "A", received: 99 })],
      },
    ];
    // Cancelled receipts do not count.
    expect(receivedSoFar(receipts, "po1", "A")).toBe(4);
    expect(pendingFor(10, 4)).toBe(6);
  });

  it("totals by condition", () => {
    const t = totalsByCondition([
      line({ received: 5, condition: "ok" }),
      line({ received: 2, condition: "dañado" }),
      line({ received: 1, condition: "cuarentena" }),
    ]);
    expect(t).toEqual({ ok: 5, dañado: 2, cuarentena: 1, incorrecto: 0 });
  });
});
