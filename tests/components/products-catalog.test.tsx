import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProductsCatalog } from "@/components/os/products-catalog";
import type { StoreProduct } from "@/server/integrations/store/store.service";

const PRODUCTS: StoreProduct[] = [
  {
    id: "1",
    title: "Proteína Whey",
    status: "ACTIVE",
    totalInventory: 12,
    price: "39.90",
    currency: "USD",
    imageUrl: null,
  },
  {
    id: "2",
    title: "Creatina (borrador)",
    status: "DRAFT",
    totalInventory: 0,
    price: "19.00",
    currency: "USD",
    imageUrl: null,
  },
  {
    id: "3",
    title: "Shaker viejo",
    status: "ARCHIVED",
    totalInventory: null,
    price: "5.00",
    currency: "USD",
    imageUrl: null,
  },
];

/**
 * The catalog reads only real (Shopify) data, filters by view, keeps the three
 * planes distinct, and never offers a write path (PBOS-001 · ORDEN 3).
 */
describe("ProductsCatalog", () => {
  it("lists all products and filters by Shopify status view", () => {
    render(<ProductsCatalog products={PRODUCTS} />);
    expect(screen.getByText("Proteína Whey")).toBeInTheDocument();
    expect(screen.getByText("Creatina (borrador)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Borradores" }));
    expect(screen.getByText("Creatina (borrador)")).toBeInTheDocument();
    expect(screen.queryByText("Proteína Whey")).toBeNull();
  });

  it("is honest that supplier/cost views need the internal catalog", () => {
    render(<ProductsCatalog products={PRODUCTS} />);
    fireEvent.click(screen.getByRole("tab", { name: "Sin proveedor" }));
    expect(screen.getByText("Requiere el catálogo interno.")).toBeInTheDocument();
  });

  it("opens a read-only detail drawer with the three planes and no edit path", () => {
    render(<ProductsCatalog products={PRODUCTS} />);
    const [firstView] = screen.getAllByRole("button", { name: "Ver" });
    fireEvent.click(firstView!);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Producto interno (canónico)")).toBeInTheDocument();
    expect(screen.getByText("Publicación en Shopify")).toBeInTheDocument();
    // The edit control exists but is disabled — no write path.
    expect(screen.getByRole("button", { name: "Editar" })).toBeDisabled();
  });
});
