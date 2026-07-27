import { describe, it, expect } from "vitest";
import { isUnpriced, validatePriceList, type LocalPriceList } from "@/lib/pricing";

describe("pricing logic (PBOS ORDEN 5)", () => {
  it("treats absent, non-numeric or zero prices as unpriced (never 0 as a real price)", () => {
    expect(isUnpriced(null)).toBe(true);
    expect(isUnpriced("")).toBe(true);
    expect(isUnpriced("0.00")).toBe(true);
    expect(isUnpriced("abc")).toBe(true);
    expect(isUnpriced("19.90")).toBe(false);
  });

  it("requires a name and a valid ISO currency, and unique names", () => {
    const lists: LocalPriceList[] = [
      { id: "1", name: "Mayoreo", currency: "USD", status: "activa" },
    ];
    expect(validatePriceList(lists, { name: "", currency: "USD" }).ok).toBe(false);
    expect(validatePriceList(lists, { name: "Retail", currency: "US" }).ok).toBe(false);
    expect(validatePriceList(lists, { name: "mayoreo", currency: "EUR" }).ok).toBe(false);
    expect(validatePriceList(lists, { name: "Retail", currency: "eur" }).ok).toBe(true);
  });
});
