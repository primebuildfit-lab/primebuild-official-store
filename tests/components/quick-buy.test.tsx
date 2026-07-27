import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuickBuy } from "@/components/os/quick-buy";

/**
 * Compra rápida works with zero products, keeps pasted SKUs honest, and never
 * offers a live effect (PBOS-001 · ORDEN 7).
 */
describe("QuickBuy", () => {
  beforeEach(() => window.localStorage.clear());

  it("is useful with no products: explains the source and links to Products", () => {
    render(<QuickBuy products={[]} connected={false} />);
    expect(screen.getByText(/Tienda no conectada/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Abrir Productos/ })).toHaveAttribute(
      "href",
      "/store/products",
    );
    expect(screen.getByText(/Cuadrícula vacía/)).toBeInTheDocument();
  });

  it("adds pasted SKUs as unrecognized lines without inventing products", () => {
    render(<QuickBuy products={[]} connected={false} />);
    fireEvent.change(screen.getByLabelText("Pegar SKUs"), {
      target: { value: "ABC-1\t10\nDEF-2\t5" },
    });
    fireEvent.click(screen.getByText("Procesar pegado"));
    // Two lines were added, both flagged as not recognized.
    expect(screen.getAllByText("no reconocido")).toHaveLength(2);
    expect(screen.getByDisplayValue("ABC-1")).toBeInTheDocument();
    expect(screen.getByText(/sin crear productos/)).toBeInTheDocument();
  });

  it("keeps the conversion-to-PO action disabled (no live purchasing)", () => {
    render(<QuickBuy products={[]} connected={false} />);
    expect(screen.getByRole("button", { name: /Convertir a órdenes de compra/ })).toBeDisabled();
  });
});
