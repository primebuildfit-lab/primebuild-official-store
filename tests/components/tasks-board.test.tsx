import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TasksBoard, type OfficialTask } from "@/components/os/tasks-board";

/**
 * The task center works with an empty collection and never invents tasks
 * (PBOS-001 · ORDEN 2).
 */
describe("TasksBoard", () => {
  it("opens empty and shows an honest per-view note", () => {
    render(<TasksBoard />);
    expect(screen.getByText("Sin tareas en esta vista.")).toBeInTheDocument();
    expect(screen.getByText(/Tus tareas de Official Store/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Bloqueadas" }));
    expect(screen.getByText("No hay tareas bloqueadas.")).toBeInTheDocument();
  });

  it("renders real tasks and filters them by view", () => {
    const tasks: OfficialTask[] = [
      { id: "1", title: "Aprobar OC-100", type: "compra", status: "pendiente" },
      {
        id: "2",
        title: "Revisar recepción con discrepancia",
        type: "recepción",
        status: "bloqueada",
      },
    ];
    render(<TasksBoard tasks={tasks} />);
    // Default "Mi trabajo" view excludes completed and shows both open tasks.
    expect(screen.getByText("Aprobar OC-100")).toBeInTheDocument();
    expect(screen.getByText("Revisar recepción con discrepancia")).toBeInTheDocument();

    // "Bloqueadas" shows only the blocked one.
    fireEvent.click(screen.getByRole("tab", { name: "Bloqueadas" }));
    expect(screen.queryByText("Aprobar OC-100")).toBeNull();
    expect(screen.getByText("Revisar recepción con discrepancia")).toBeInTheDocument();
  });
});
