import { describe, it, expect } from "vitest";
import {
  deriveBalances,
  postReceiptMovements,
  isReceiptPosted,
  reverseMovement,
  signedQuantity,
  type InventoryMovement,
} from "@/lib/inventory";
import type { Receipt } from "@/lib/receiving";

let counter = 0;
const id = () => `m${++counter}`;

function mov(p: Partial<InventoryMovement>): InventoryMovement {
  return {
    id: p.id ?? id(),
    movementType: p.movementType ?? "recepcion",
    sku: p.sku ?? "A",
    warehouseId: p.warehouseId ?? "W1",
    quantity: p.quantity ?? 1,
    unit: "unidad",
    condition: p.condition ?? "ok",
    direction: p.direction ?? "in",
    sourceType: p.sourceType ?? "recepcion",
    sourceId: p.sourceId,
    correlationId: p.correlationId,
    actor: "op",
    reason: "x",
    occurredAt: p.occurredAt ?? "2026-07-20T00:00:00Z",
    recordedAt: "2026-07-20T00:00:00Z",
    status: "publicado",
    version: 1,
    reversalOf: p.reversalOf,
  };
}

describe("inventory ledger (PBOS ORDEN 11)", () => {
  it("derives balances from movements; damaged/quarantine excluded from on-hand", () => {
    const movements = [
      mov({ sku: "A", condition: "ok", quantity: 10, direction: "in" }),
      mov({ sku: "A", condition: "ok", quantity: 3, direction: "out" }),
      mov({ sku: "A", condition: "dañado", quantity: 2, direction: "in" }),
      mov({ sku: "A", condition: "cuarentena", quantity: 1, direction: "in" }),
    ];
    const [b] = deriveBalances(movements);
    expect(b!.onHand).toBe(7); // 10 - 3
    expect(b!.damaged).toBe(2);
    expect(b!.quarantine).toBe(1);
    expect(b!.physical).toBe(10); // 7 + 2 + 1
  });

  it("signedQuantity: in is positive, out is negative", () => {
    expect(signedQuantity({ quantity: 5, direction: "in" })).toBe(5);
    expect(signedQuantity({ quantity: 5, direction: "out" })).toBe(-5);
  });

  it("posts a closed receipt once (idempotent) and excludes 'incorrecto'", () => {
    const receipt: Receipt = {
      id: "r1",
      poId: "po1",
      poNumber: "OC-0001",
      warehouse: "W1",
      status: "completada",
      createdAt: "",
      closedAt: "2026-07-20T00:00:00Z",
      lines: [
        { id: "l1", sku: "A", expected: 10, received: 10, condition: "ok" },
        { id: "l2", sku: "B", expected: 2, received: 2, condition: "dañado" },
        { id: "l3", sku: "C", expected: 1, received: 1, condition: "incorrecto" },
      ],
    };
    const first = postReceiptMovements(receipt, "op", [], "2026-07-20T00:00:00Z", id);
    // "incorrecto" is not posted → 2 movements.
    expect(first).toHaveLength(2);
    expect(isReceiptPosted(first, "r1")).toBe(true);
    // Re-posting with the existing movements is a no-op (idempotent).
    const second = postReceiptMovements(receipt, "op", first, "2026-07-20T00:00:00Z", id);
    expect(second).toHaveLength(0);
  });

  it("does not post a receipt that is not closed", () => {
    const draft: Receipt = {
      id: "r2",
      poId: "po1",
      poNumber: "OC-0002",
      warehouse: "W1",
      status: "borrador",
      createdAt: "",
      lines: [{ id: "l", sku: "A", expected: 5, received: 5, condition: "ok" }],
    };
    expect(postReceiptMovements(draft, "op")).toHaveLength(0);
  });

  it("reverses a movement with a compensating opposite-direction entry", () => {
    const original = mov({ sku: "A", quantity: 4, direction: "in", condition: "ok" });
    const rev = reverseMovement(original, "op", "corrección", "2026-07-21T00:00:00Z", id);
    expect(rev.direction).toBe("out");
    expect(rev.reversalOf).toBe(original.id);
    const net = deriveBalances([original, rev])[0]!;
    expect(net.onHand).toBe(0);
  });
});
