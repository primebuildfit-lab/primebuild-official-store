import { describe, it, expect } from "vitest";
import {
  parsePaste,
  lineSubtotal,
  validateLine,
  groupTotals,
  type QuickBuyLine,
} from "@/lib/quick-buy";

function line(p: Partial<QuickBuyLine>): QuickBuyLine {
  return {
    id: p.id ?? "x",
    sku: p.sku ?? "SKU",
    recognized: p.recognized ?? false,
    unit: p.unit ?? "unidad",
    qty: p.qty ?? 1,
    supplier: p.supplier,
    warehouse: p.warehouse,
    moq: p.moq,
    multiple: p.multiple,
    unitCost: p.unitCost,
    currency: p.currency,
  };
}

describe("quick-buy paste parsing (PBOS ORDEN 7)", () => {
  it("parses SKU + qty from tab/comma/space separated rows and ignores blanks", () => {
    const parsed = parsePaste("ABC-1\t5\n\nDEF-2, 10\n GHI-3   3 \nJKL-4");
    expect(parsed).toEqual([
      { sku: "ABC-1", qty: 5 },
      { sku: "DEF-2", qty: 10 },
      { sku: "GHI-3", qty: 3 },
      { sku: "JKL-4", qty: 1 },
    ]);
  });
});

describe("quick-buy calculations", () => {
  it("computes a subtotal only when the unit cost is known (never 0 for unknown)", () => {
    expect(lineSubtotal({ qty: 3, unitCost: 10 })).toBe(30);
    expect(lineSubtotal({ qty: 3, unitCost: null })).toBeNull();
    expect(lineSubtotal({ qty: 0, unitCost: 10 })).toBeNull();
  });

  it("validates qty, MOQ and multiples", () => {
    expect(validateLine({ qty: 0, moq: null, multiple: null })).toContain(
      "La cantidad debe ser mayor que 0.",
    );
    expect(validateLine({ qty: 5, moq: 10, multiple: null })[0]).toMatch(/MOQ/);
    expect(validateLine({ qty: 5, moq: null, multiple: 4 })[0]).toMatch(/múltiplo/);
    expect(validateLine({ qty: 12, moq: 10, multiple: 6 })).toEqual([]);
  });

  it("groups totals by supplier and never mixes currencies", () => {
    const lines = [
      line({ supplier: "Acme", qty: 2, unitCost: 5, currency: "USD" }),
      line({ supplier: "Acme", qty: 1, unitCost: 3, currency: "EUR" }),
      line({ supplier: "Acme", qty: 4, unitCost: null, currency: "USD" }),
    ];
    const totals = groupTotals(lines, "supplier");
    const usd = totals.find((t) => t.currency === "USD")!;
    const eur = totals.find((t) => t.currency === "EUR")!;
    expect(usd.subtotal).toBe(10);
    expect(usd.linesWithoutCost).toBe(1);
    expect(eur.subtotal).toBe(3);
    // USD and EUR stay separate — never summed together.
    expect(totals.length).toBe(2);
  });
});
