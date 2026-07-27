import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ConnectionState,
  PermissionState,
  ErrorState,
  NoData,
  NotImplemented,
  BulkActionBar,
} from "@/components/ds";

/**
 * Honest states say plainly that there is nothing real to show, and never infer
 * health from the absence of errors (PBOS-001 · ORDEN 0.E). BulkActionBar stays
 * hidden without a selection (ORDEN 0.D).
 */
describe("honest states", () => {
  it("ConnectionState names the source and stays honest", () => {
    render(<ConnectionState source="Shopify" />);
    expect(screen.getByText(/Shopify no conectada/)).toBeInTheDocument();
    expect(screen.getByText(/no se infiere conexión ni salud/i)).toBeInTheDocument();
  });

  it("PermissionState explains the missing capability", () => {
    render(<PermissionState capability="ver costos" />);
    expect(screen.getByText(/Sin permisos/)).toBeInTheDocument();
    expect(screen.getByText(/ver costos/)).toBeInTheDocument();
  });

  it("ErrorState shows the real message and can retry", () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Timeout real" onRetry={onRetry} />);
    expect(screen.getByText("Timeout real")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Reintentar"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("NoData and NotImplemented render honest copy", () => {
    const { rerender } = render(<NoData />);
    expect(screen.getByText("Aún no existen datos.")).toBeInTheDocument();
    rerender(<NotImplemented />);
    expect(screen.getByText("No implementado todavía.")).toBeInTheDocument();
  });
});

describe("BulkActionBar", () => {
  it("is hidden with no selection and appears with one", () => {
    const run = vi.fn();
    const { rerender, container } = render(
      <BulkActionBar count={0} actions={[{ id: "x", label: "Exportar", onRun: run }]} />,
    );
    expect(container).toBeEmptyDOMElement();

    rerender(<BulkActionBar count={3} actions={[{ id: "x", label: "Exportar", onRun: run }]} />);
    expect(screen.getByText(/3/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Exportar"));
    expect(run).toHaveBeenCalledTimes(1);
  });
});
