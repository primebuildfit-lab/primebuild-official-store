import { describe, it, expect } from "vitest";
import { validateSupplier, sourceLabel, type Supplier } from "@/lib/suppliers";

describe("suppliers (PBOS ORDEN 8)", () => {
  const suppliers: Supplier[] = [
    {
      id: "1",
      name: "Acme",
      status: "activo",
      source: "manual",
      verified: false,
      createdAt: "2026-07-20",
    },
  ];

  it("requires a unique name and a valid or empty ISO currency", () => {
    expect(validateSupplier(suppliers, { name: "" }).ok).toBe(false);
    expect(validateSupplier(suppliers, { name: "acme" }).ok).toBe(false);
    expect(validateSupplier(suppliers, { name: "Globex", currency: "US" }).ok).toBe(false);
    expect(validateSupplier(suppliers, { name: "Globex" }).ok).toBe(true);
    expect(validateSupplier(suppliers, { name: "Globex", currency: "usd" }).ok).toBe(true);
  });

  it("labels every data source distinctly", () => {
    expect(sourceLabel("manual")).toMatch(/manual/i);
    expect(sourceLabel("importado")).toMatch(/importad/i);
    expect(sourceLabel("conectado")).toMatch(/conectad/i);
  });
});
