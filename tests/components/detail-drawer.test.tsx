import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DetailDrawer } from "@/components/ds";

/**
 * DetailDrawer opens/closes, closes on Escape, and shows an honest empty state
 * (PBOS-001 · ORDEN 0.B/D).
 */
describe("DetailDrawer", () => {
  it("renders nothing when closed", () => {
    render(
      <DetailDrawer open={false} onClose={() => {}} title="Detalle">
        <p>contenido</p>
      </DetailDrawer>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders a labelled dialog with content when open", () => {
    render(
      <DetailDrawer open onClose={() => {}} title="Detalle del producto">
        <p>contenido real</p>
      </DetailDrawer>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-label", "Detalle del producto");
    expect(screen.getByText("contenido real")).toBeInTheDocument();
  });

  it("shows an honest empty state when it has no content", () => {
    render(<DetailDrawer open onClose={() => {}} title="Detalle" emptyMessage="Sin selección." />);
    expect(screen.getByText("Sin selección.")).toBeInTheDocument();
  });

  it("closes on Escape and via the close button", () => {
    const onClose = vi.fn();
    render(
      <DetailDrawer open onClose={onClose} title="Detalle">
        <p>x</p>
      </DetailDrawer>,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByLabelText("Cerrar"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
