import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { StoreDefinitionEditor } from "@/components/os/store-definition-editor";

export const metadata: Metadata = { title: "Diseño visual" };

/**
 * Diseño visual (PBOS-001 · ORDEN 17). Edits the single local, versioned
 * StoreDefinition (identity, structure, blocks, design tokens, policies, SEO). It
 * references canonical products/collections/content, introduces no demo content,
 * blocks the newsletter block, and does not pretend to edit Shopify's theme.
 * Saving creates a revision; restoring creates a new one. Nothing publishes.
 */
export default function DesignPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Tienda online"
        title="Diseño visual"
        description="Una única definición de tienda, local y versionada."
        icon="palette"
      />

      <Panel className="mb-6" icon="shield" title="Una sola StoreDefinition, sin datos ficticios">
        <p className="text-sm text-muted">
          Contenido y diseño se editan sobre una{" "}
          <span className="font-medium text-foreground">única StoreDefinition</span> local; no se
          duplican productos, medios ni colecciones (se referencian). No se insertan contenidos,
          testimonios ni promociones ficticias, y las capacidades que pertenecen a Shopify (tema,
          checkout) se abren allí. Guardar crea una revisión y{" "}
          <span className="font-medium text-foreground">no publica ni sincroniza</span>.
        </p>
      </Panel>

      <StoreDefinitionEditor initialTab="estructura" />
    </div>
  );
}
