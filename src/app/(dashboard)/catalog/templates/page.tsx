import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { TemplatesBoard } from "@/components/os/templates-board";

export const metadata: Metadata = { title: "Plantillas" };

/**
 * Plantillas versionadas del storefront (PBOS-DPB-MEGA-FABLE-001 §16-§17):
 * estructura autorizada de Shopify convertida a componentes propios. Publicar
 * nunca sobrescribe: la versión anterior queda Superseded.
 */
export default function TemplatesPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Catálogo"
        title="Plantillas"
        description="Versionado Draft → In review → Approved → Published → Superseded → Archived."
        icon="file"
      />
      <Panel className="mb-6" icon="shield" title="Sin theme runtime de Shopify">
        <p className="text-sm text-muted">
          Las plantillas copian estructura y contenido permitido como punto de partida y se convierten
          a componentes propios del storefront: la Official Store no depende del theme runtime de
          Shopify ni copia código propietario.
        </p>
      </Panel>
      <TemplatesBoard />
    </div>
  );
}
