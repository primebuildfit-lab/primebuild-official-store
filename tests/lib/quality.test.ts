import { describe, it, expect } from "vitest";
import {
  canQualityTransition,
  deriveQualitySignals,
  buildQuarantineRelease,
  type QualityIncident,
} from "@/lib/quality";
import { deriveBalances, type InventoryMovement } from "@/lib/inventory";
import type { Receipt } from "@/lib/receiving";

let c = 0;
const id = () => `m${++c}`;
const mov = (over: Partial<InventoryMovement>): InventoryMovement => ({
  id: over.id ?? id(),
  movementType: "recepcion",
  sku: over.sku ?? "A",
  warehouseId: over.warehouseId ?? "W1",
  quantity: over.quantity ?? 1,
  unit: "unidad",
  condition: over.condition ?? "ok",
  direction: over.direction ?? "in",
  sourceType: "recepcion",
  actor: "op",
  reason: "x",
  occurredAt: "2026-07-20",
  recordedAt: "2026-07-20",
  status: "publicado",
  version: 1,
});

describe("quality & traceability (corrective)", () => {
  it("derives real damage/quarantine and lots; never invents", () => {
    const movements = [
      mov({ sku: "A", condition: "cuarentena", quantity: 5, direction: "in" }),
      mov({ sku: "B", condition: "dañado", quantity: 2, direction: "in" }),
    ];
    const receipts: Receipt[] = [
      {
        id: "r1",
        poId: "p",
        poNumber: "OC-1",
        warehouse: "W1",
        status: "con-discrepancias",
        createdAt: "",
        lines: [
          { id: "l", sku: "A", expected: 5, received: 5, condition: "cuarentena", lot: "L-1" },
        ],
      },
    ];
    const sig = deriveQualitySignals(movements, receipts, []);
    expect(sig.quarantine).toBe(5);
    expect(sig.damaged).toBe(2);
    expect(sig.discrepancyReceipts).toHaveLength(1);
    expect(sig.lots).toEqual([{ sku: "A", lot: "L-1", source: "OC-1" }]);
  });

  it("releasing quarantine posts compensating movements, never edits a balance", () => {
    const start = [mov({ sku: "A", condition: "cuarentena", quantity: 5, direction: "in" })];
    const release = buildQuarantineRelease(
      { sku: "A", warehouse: "W1", qty: 5, actor: "op", reason: "aprobado" },
      "t",
      id,
    );
    expect(release).toHaveLength(2);
    const b = deriveBalances([...start, ...release]).find((x) => x.key === "A")!;
    expect(b.quarantine).toBe(0); // released out of quarantine
    expect(b.onHand).toBe(5); // moved to sound stock
  });

  it("has a non-skippable incident lifecycle", () => {
    expect(canQualityTransition("detectada", "en-revision")).toBe(true);
    expect(canQualityTransition("detectada", "cerrada")).toBe(false);
    const _typecheck: QualityIncident["status"] = "en-cuarentena";
    expect(_typecheck).toBe("en-cuarentena");
  });
});
