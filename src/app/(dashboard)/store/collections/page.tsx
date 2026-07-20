import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { StoreSourceBadge } from "@/components/os/module-header";
import { CatalogBoard } from "@/components/os/catalog-board";
import { loadStore } from "@/server/integrations/store/load";
import { listCollections } from "@/server/integrations/store/store.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Colecciones" };

/**
 * Categorías y colecciones (PBOS-001 · ORDEN 4). Three concepts kept distinct:
 * internal categories, commercial collections and Shopify collections, plus tags
 * and attributes. Internal categories/collections are operator-defined and
 * persist locally; Shopify collections are read-only. Nothing is seeded.
 */
export default async function CollectionsPage() {
  const res = await loadStore(() => listCollections(100));

  return (
    <div>
      <PageHeader
        eyebrow="Catálogo"
        title="Categorías y colecciones"
        description="Organización interna y presentación comercial, separadas de Shopify."
        icon="layers"
      >
        <StoreSourceBadge connected={res.connected} error={res.error} />
      </PageHeader>

      <Panel className="mb-6" icon="shield" title="Tres conceptos, nunca mezclados">
        <p className="text-sm text-muted">
          Las <span className="font-medium text-foreground">categorías internas</span> ordenan el
          producto dentro de PrimeBuild; las{" "}
          <span className="font-medium text-foreground">colecciones comerciales</span> ordenan la
          presentación; las <span className="font-medium text-foreground">colecciones Shopify</span>{" "}
          solo reflejan lo observado en Shopify (solo lectura). Las relaciones con productos usan
          referencias canónicas, no copias.
        </p>
      </Panel>

      <CatalogBoard connected={res.connected} collections={res.data ?? []} />
    </div>
  );
}
