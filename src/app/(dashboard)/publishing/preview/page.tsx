import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { PublishingBoard } from "@/components/os/publishing-board";
import { loadStore } from "@/server/integrations/store/load";
import { storeOverview } from "@/server/integrations/store/store.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Preview y versiones" };

/**
 * Preview y versiones (PBOS-001 · ORDEN 18). Preview consumes the single
 * StoreDefinition (no duplicate); every local preview is labelled "no publicada".
 * Versions move through distinct states — Validado ≠ Publicado, Autorizado ≠
 * desplegado — and publishing is blocked in this phase.
 */
export default async function PreviewPage() {
  const res = await loadStore(() => storeOverview());
  const connected = res.connected && res.data != null;

  return (
    <div>
      <PageHeader
        eyebrow="Publicación"
        title="Preview y versiones"
        description="Revisa la definición de tienda antes de preparar una versión."
        icon="eye"
      />

      <Panel className="mb-6" icon="shield" title="Preview local, publicación bloqueada">
        <p className="text-sm text-muted">
          La vista previa usa la{" "}
          <span className="font-medium text-foreground">misma StoreDefinition</span> y se marca
          &quot;Vista previa local — no publicada&quot;. Preparar y autorizar una versión es local;{" "}
          <span className="font-medium text-foreground">publicar o sincronizar está bloqueado</span>{" "}
          en esta fase.
        </p>
      </Panel>

      <PublishingBoard connected={connected} variant="preview" />
    </div>
  );
}
