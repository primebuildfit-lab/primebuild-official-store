import { describe, it, expect } from "vitest";
import {
  validatePolicy,
  applyLot,
  computeSuggestion,
  type ReplenishmentPolicy,
} from "@/lib/replenishment";

const policy = (p: Partial<ReplenishmentPolicy>): ReplenishmentPolicy => ({
  id: p.id ?? "p1",
  name: p.name ?? "Whey WH-01",
  warehouseCode: p.warehouseCode ?? "WH-01",
  sku: p.sku ?? "A",
  preferredSupplier: p.preferredSupplier,
  reorderPoint: p.reorderPoint ?? null,
  targetStock: p.targetStock ?? null,
  safetyStock: p.safetyStock ?? null,
  leadTimeDays: p.leadTimeDays ?? null,
  moq: p.moq ?? null,
  multiple: p.multiple ?? null,
  status: "activa",
  version: 1,
  createdAt: "",
});

describe("replenishment (PBOS ORDEN 15)", () => {
  it("validates unique policy per sku+warehouse", () => {
    const existing = [policy({})];
    expect(validatePolicy(existing, { name: "x", sku: "a", warehouseCode: "WH-01" }).ok).toBe(
      false,
    );
    expect(validatePolicy(existing, { name: "x", sku: "B", warehouseCode: "WH-01" }).ok).toBe(true);
  });

  it("applies MOQ and multiples", () => {
    expect(applyLot(7, null, null)).toBe(7);
    expect(applyLot(7, null, 5)).toBe(10); // up to multiple of 5
    expect(applyLot(2, 12, 6)).toBe(12); // MOQ 12 (already a multiple of 6)
    expect(applyLot(0, 12, 6)).toBe(0); // nothing needed → 0
  });

  it("returns 'insufficient data' (qty null) when target stock is missing", () => {
    const s = computeSuggestion(policy({ targetStock: null }), { available: 3 });
    expect(s.qty).toBeNull();
    expect(s.missing).toContain("stock objetivo");
  });

  it("suggests a real quantity from available + incoming, respecting the lot", () => {
    const s = computeSuggestion(policy({ targetStock: 100, moq: 10, multiple: 10 }), {
      available: 20,
      incoming: 15,
    });
    // 100 - (20 + 15) = 65 → lot of 10 → 70
    expect(s.qty).toBe(70);
    expect(s.formula).toMatch(/100/);
  });

  it("suggests nothing when available is above the threshold", () => {
    const s = computeSuggestion(policy({ targetStock: 50, reorderPoint: 30 }), { available: 40 });
    expect(s.qty).toBe(0);
  });

  it("does not invent demand: it lists the missing-demand limitation", () => {
    const s = computeSuggestion(policy({ targetStock: 50 }), { available: 10 });
    expect(s.limitations.join(" ")).toMatch(/demanda/i);
  });
});
