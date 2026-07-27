import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { StoreSourceBadge } from "@/components/os/module-header";
import { PricingBoard } from "@/components/os/pricing-board";
import { loadStore } from "@/server/integrations/store/load";
import { listProducts } from "@/server/integrations/store/store.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Precios y listas" };

/**
 * Precios y listas (PBOS-001 · ORDEN 5). Sale prices only, kept separate from
 * supplier costs. Shows the read-only Shopify observed price (live edits blocked)
 * and lets the operator define local price lists — one currency each, no mixing,
 * no implicit conversion. Unknown prices read "No medido", never 0.
 */
export default async function PricingPage() {
  const res = await loadStore(() => listProducts(100));

  return (
    <div>
      <PageHeader
        eyebrow="Catálogo"
        title="Precios y listas"
        description="Precios de venta y listas por moneda, separados de los costos de compra."
        icon="tag"
      >
        <StoreSourceBadge connected={res.connected} error={res.error} />
      </PageHeader>

      <Panel className="mb-6" icon="shield" title="Precio de venta ≠ costo de compra">
        <p className="text-sm text-muted">
          Este espacio administra{" "}
          <span className="font-medium text-foreground">precios de venta</span>. El costo de compra,
          el landed cost y el margen se calculan en Costos y márgenes. El precio observado proviene
          de Shopify (solo lectura) y su edición live está bloqueada; las listas de precios se
          guardan localmente con una sola moneda cada una.
        </p>
      </Panel>

      <PricingBoard connected={res.connected} products={res.data ?? []} />
    </div>
  );
}
