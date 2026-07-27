import { describe, it, expect } from "vitest";
import {
  canCountTransition,
  lineDiff,
  exceedsTolerance,
  visibleExpected,
  canApplyAdjustment,
  buildAdjustmentMovements,
  type CountLine,
  type StockCount,
} from "@/lib/counts";
import { deriveBalances } from "@/lib/inventory";

let c = 0;
const id = () => `m${++c}`;

const line = (p: Partial<CountLine>): CountLine => ({
  id: p.id ?? "l",
  sku: p.sku ?? "A",
  expected: p.expected ?? 10,
  counted: p.counted ?? null,
});

const count = (p: Partial<StockCount>): StockCount => ({
  id: p.id ?? "c1",
  code: p.code ?? "CNT-1",
  warehouseCode: p.warehouseCode ?? "WH-01",
  status: p.status ?? "aprobado",
  blind: p.blind ?? false,
  doubleCount: false,
  tolerance: p.tolerance ?? null,
  requiresApproval: p.requiresApproval ?? false,
  approver: p.approver,
  lines: p.lines ?? [line({ counted: 8 })],
  version: 1,
});

describe("counts & adjustments (PBOS ORDEN 14)", () => {
  it("computes differences and tolerance", () => {
    expect(lineDiff(line({ counted: 8 }))).toBe(-2);
    expect(lineDiff(line({ counted: null }))).toBeNull();
    expect(exceedsTolerance(line({ counted: 8 }), 1)).toBe(true);
    expect(exceedsTolerance(line({ counted: 8 }), 5)).toBe(false);
  });

  it("withholds expected in a blind count at the data level unless authorized", () => {
    const l = line({ expected: 10 });
    expect(visibleExpected(l, { blind: true, canSeeExpected: false })).toBeNull();
    expect(visibleExpected(l, { blind: true, canSeeExpected: true })).toBe(10);
    expect(visibleExpected(l, { blind: false, canSeeExpected: false })).toBe(10);
  });

  it("forbids counting from skipping to applied and applying without preconditions", () => {
    expect(canCountTransition("planificado", "aplicado")).toBe(false);
    expect(canCountTransition("aprobado", "aplicado")).toBe(true);
    expect(canApplyAdjustment(count({ status: "en-progreso" }), "x", true).ok).toBe(false);
    expect(canApplyAdjustment(count({}), "", true).ok).toBe(false); // no reason
    expect(canApplyAdjustment(count({}), "recuento", false).ok).toBe(false); // no capability
    expect(
      canApplyAdjustment(count({ requiresApproval: true, approver: undefined }), "r", true).ok,
    ).toBe(false);
    expect(canApplyAdjustment(count({}), "recuento", true).ok).toBe(true);
  });

  it("applies an adjustment as append-only movements, idempotently, without inventing cost", () => {
    const cnt = count({ lines: [line({ sku: "A", expected: 10, counted: 8 })] });
    const first = buildAdjustmentMovements(cnt, "op", [], "t", id);
    expect(first).toHaveLength(1);
    expect(first[0]!.movementType).toBe("ajuste-negativo");
    expect(first[0]!.direction).toBe("out");
    expect(first[0]!.quantity).toBe(2);
    // Re-apply is idempotent.
    expect(buildAdjustmentMovements(cnt, "op", first, "t", id)).toHaveLength(0);
    // Net effect after seeding on-hand 10 then adjust -2 → 8.
    const seed = {
      ...first[0]!,
      id: id(),
      direction: "in" as const,
      quantity: 10,
      correlationId: "seed",
    };
    expect(deriveBalances([seed, ...first])[0]!.onHand).toBe(8);
  });
});
