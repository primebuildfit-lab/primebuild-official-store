import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { TasksBoard } from "@/components/os/tasks-board";
import { getSection } from "@/config/sections";

export const metadata: Metadata = { title: "Tareas y alertas" };

/**
 * Tareas y alertas (PBOS-001 · ORDEN 2). The task center for Official Store's
 * own operational work. There is no task store yet, so it opens with an honest
 * empty collection — it invents no tasks, dates or assignees. Company-wide
 * priorities are not duplicated here; they live in PrimeBuild Internal OS.
 */
export default function TasksPage() {
  const section = getSection("tasks");

  return (
    <div>
      <PageHeader
        eyebrow="Inicio"
        title="Tareas y alertas"
        description={section?.summary ?? "Trabajo pendiente y avisos de Official Store."}
        icon="bell"
      />

      <TasksBoard />

      <Panel className="mt-6" icon="shield" title="Alcance y honestidad">
        <ul className="flex flex-col gap-1.5 text-sm text-muted">
          <li>
            Solo trabajo de Official Store: compras, recepciones, inventario, proveedores,
            productos, pedidos, devoluciones, Shopify, publicación, integraciones y soporte.
          </li>
          <li>Las prioridades de empresa no se duplican aquí — viven en PrimeBuild Internal OS.</li>
          <li>
            Una alerta no es automáticamente una tarea; una tarea automática enlazará al evento real
            que la creó. Aún no hay almacenamiento de tareas: no se inventan tareas, fechas ni
            responsables.
          </li>
        </ul>
      </Panel>
    </div>
  );
}
