import type { Metadata } from "next";
import { PageHeader, Panel, StoreNotConnected } from "@/components/ds";
import { StoreSourceBadge } from "@/components/os/module-header";
import { ProductsCatalog } from "@/components/os/products-catalog";
import { loadStore } from "@/server/integrations/store/load";
import { listProducts } from "@/server/integrations/store/store.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Productos" };

/**
 * Productos (PBOS-001 · ORDEN 3) — the canonical product catalog. It reads only
 * real data and keeps three planes distinct: the internal product, its Shopify
 * publication and inventory. There is no internal catalog store yet, so the rows
 * are a read-only projection of Shopify and creating/editing is disabled — this
 * console never writes to Shopify.
 */
export default async function ProductsPage() {
  const res = await loadStore(() => listProducts(100));
  const products = res.data ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Catálogo"
        title="Productos"
        description="El catálogo canónico de productos y variantes."
        icon="box"
      >
        <StoreSourceBadge connected={res.connected} error={res.error} />
        <button
          type="button"
          disabled
          title="Requiere el catálogo interno con persistencia. Aún no existe; Official Store nunca escribe en Shopify."
          className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-faint opacity-60"
        >
          Añadir producto
        </button>
      </PageHeader>

      <Panel className="mb-6" icon="layers" title="Tres planos distintos, solo lectura">
        <p className="text-sm text-muted">
          Un <span className="font-medium text-foreground">producto interno</span> puede existir sin
          publicarse; su <span className="font-medium text-foreground">publicación en Shopify</span>{" "}
          y su <span className="font-medium text-foreground">inventario</span> son planos separados.
          Hoy no hay catálogo interno con almacenamiento: las filas son una proyección de solo
          lectura de Shopify y la edición está deshabilitada. Nada se inventa y nada se escribe en
          la tienda.
        </p>
      </Panel>

      {!res.connected ? (
        <StoreNotConnected error={res.error} />
      ) : (
        <ProductsCatalog products={products} />
      )}
    </div>
  );
}
