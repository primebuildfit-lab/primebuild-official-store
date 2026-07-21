import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { StoreDefinitionEditor } from "@/components/os/store-definition-editor";

export const metadata: Metadata = { title: "Páginas y navegación" };

/**
 * Páginas y navegación (PBOS-001 · ORDEN 17). The same single StoreDefinition as
 * Diseño visual, opened on the navigation/pages tabs — not a separate definition.
 * Saving creates a revision; nothing publishes or syncs.
 */
export default function PagesPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Tienda online"
        title="Páginas y navegación"
        description="Menús y páginas de la misma definición de tienda."
        icon="file"
      />

      <Panel className="mb-6" icon="shield" title="La misma StoreDefinition">
        <p className="text-sm text-muted">
          Estas páginas y menús son parte de la{" "}
          <span className="font-medium text-foreground">única StoreDefinition</span> local (la misma
          que Diseño visual), no una copia. Los cambios se guardan como revisión y no se publican.
        </p>
      </Panel>

      <StoreDefinitionEditor initialTab="navegacion" />
    </div>
  );
}
