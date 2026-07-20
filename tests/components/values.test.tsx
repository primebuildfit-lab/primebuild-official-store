import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MoneyValue, QuantityValue, formatMoney, decimalPlaces } from "@/components/ds";

/**
 * Value primitives keep unit and currency and never fabricate a measurement
 * (PBOS-001 · ORDEN 0.D).
 */
describe("MoneyValue / QuantityValue", () => {
  it("decimalPlaces counts a number's own precision", () => {
    expect(decimalPlaces(10)).toBe(0);
    expect(decimalPlaces(10.5)).toBe(1);
    expect(decimalPlaces(10.125)).toBe(3);
  });

  it("formatMoney preserves precision and never guesses an unknown currency symbol", () => {
    // Locale-agnostic: check the digits survive, not the separators.
    expect(formatMoney(1234.5, "USD")).toMatch(/234/);
    expect(formatMoney(10.125, "USD")).toMatch(/125/); // 3 decimals preserved
    // An unknown code falls back to a plain number + the code, not a symbol.
    expect(formatMoney(1000, "ZZZ")).toMatch(/ZZZ/);
  });

  it("MoneyValue shows 'No medido' when the amount is missing (never 0)", () => {
    render(<MoneyValue amount={null} currency="USD" />);
    expect(screen.getByText("No medido")).toBeInTheDocument();
  });

  it("MoneyValue flags a missing currency instead of assuming one", () => {
    render(<MoneyValue amount={99} currency={null} />);
    expect(screen.getByText(/moneda no definida/)).toBeInTheDocument();
  });

  it("QuantityValue shows value with the exact unit provided", () => {
    render(<QuantityValue value={12} unit="cajas" />);
    expect(screen.getByText("cajas")).toBeInTheDocument();
    expect(screen.getByText(/12/)).toBeInTheDocument();
  });

  it("QuantityValue flags a missing unit and shows 'No medido' for a missing value", () => {
    const { rerender } = render(<QuantityValue value={5} unit={null} />);
    expect(screen.getByText(/sin unidad/)).toBeInTheDocument();
    rerender(<QuantityValue value={null} unit="unidad" />);
    expect(screen.getByText("No medido")).toBeInTheDocument();
  });
});
