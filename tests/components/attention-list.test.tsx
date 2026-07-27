import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AttentionList } from "@/components/os/attention-list";

/**
 * The resumen's "Requiere atención" list renders only real items and, when empty,
 * shows an honest state — it never fabricates alerts (PBOS-001 · ORDEN 1).
 */
describe("AttentionList", () => {
  it("shows an honest empty state with a note when there is nothing to attend to", () => {
    render(<AttentionList items={[]} emptyNote="Las fuentes operativas se conectan por orden." />);
    expect(screen.getByText("Nada requiere atención ahora.")).toBeInTheDocument();
    expect(screen.getByText(/fuentes operativas/)).toBeInTheDocument();
  });

  it("renders real items with their source and action", () => {
    render(
      <AttentionList
        items={[
          {
            id: "x",
            severity: "warning",
            title: "No se pudo leer la tienda oficial",
            detail: "Timeout",
            source: "Shopify",
            href: "/status",
            actionLabel: "Ver estado",
          },
        ]}
      />,
    );
    expect(screen.getByText("No se pudo leer la tienda oficial")).toBeInTheDocument();
    expect(screen.getByText(/Fuente: Shopify/)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/status");
  });
});
