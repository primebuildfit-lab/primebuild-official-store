import { describe, it, expect } from "vitest";
import { computeInventoryTotals, countByStatus, unmeasured, measured } from "@/lib/metrics";
import type { InventoryMovement } from "@/lib/inventory";

const mov = (over: Partial<InventoryMovement>): InventoryMovement => ({
  id: over.id ?? Math.random().toString(),
  movementType: "recepcion",
  sku: over.sku ?? "A",
  warehouseId: over.warehouseId ?? "WH-01",
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

describe("metrics (PBOS ORDEN 24)", () => {
  it("computes inventory totals from the ledger, scoped by warehouse", () => {
    const movements = [
      mov({ sku: "A", warehouseId: "WH-01", quantity: 10, condition: "ok" }),
      mov({ sku: "B", warehouseId: "WH-01", quantity: 2, condition: "dañado" }),
      mov({ sku: "C", warehouseId: "WH-02", quantity: 5, condition: "ok" }),
    ];
    const all = computeInventoryTotals(movements);
    expect(all.physical).toBe(17);
    expect(all.onHand).toBe(15);
    expect(all.damaged).toBe(2);

    const wh1 = computeInventoryTotals(movements, "WH-01");
    expect(wh1.physical).toBe(12); // WH-02 excluded — warehouses not mixed
  });

  it("counts by status", () => {
    expect(countByStatus([{ s: "a" }, { s: "a" }, { s: "b" }], (x) => x.s)).toEqual({ a: 2, b: 1 });
  });

  it("marks unmeasured metrics honestly (no fabricated value)", () => {
    const m = unmeasured("Ventas", "Ventas netas", "Sin fuente de ventas");
    expect(m.value).toBeNull();
    expect(m.contract.state).toBe("no-medido");
    const ok = measured("Físico", "Unidades físicas", "Σ movimientos", "uds", "ledger", "17");
    expect(ok.value).toBe("17");
    expect(ok.contract.state).toBe("medido");
  });
});
