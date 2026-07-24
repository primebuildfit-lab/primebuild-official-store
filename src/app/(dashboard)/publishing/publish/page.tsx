import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { PublishingBoard } from "@/components/os/publishing-board";
import { loadStore } from "@/server/integrations/store/load";
import { storeOverview } from "@/server/integrations/store/store.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Publicación" };

/**
 * Publicación (PBOS-001 · ORDEN 18). The publication step over the same versions.
 * Preparing and authorizing are local; publishing/syncing to the public store is
 * blocked in this phase — the final action is disabled with an explicit reason.
 */
export default async function PublishPage() {
  const res = await loadStore(() => storeOverview());
  const connected = res.connected && res.data != null;

  return (
    <div>
      <PageHeader
        eyebrow="Publicación"
        title="Publicación"
        description="Preparar y autorizar versiones; publicar está bloqueado en esta fase."
        icon="upload"
      />

      <Panel className="mb-6" icon="shield" title="Publicación no autorizada en esta fase">
        <p className="text-sm text-muted">
          Aquí se validan y autorizan versiones de la definición de tienda. La acción final de{" "}
          <span className="font-medium text-foreground">
            publicar/sincronizar hacia la tienda pública está bloqueada
          </span>
          : generar un artefacto no es sincronizar, y autorizar no es desplegar.
        </p>
      </Panel>

      <PublishingBoard connected={connected} variant="publish" />
    </div>
  );
}
