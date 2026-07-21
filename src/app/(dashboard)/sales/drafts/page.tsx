import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { StoreSourceBadge } from "@/components/os/module-header";
import { DraftsBoard } from "@/components/os/drafts-board";
import { loadStore } from "@/server/integrations/store/load";
import { listProducts } from "@/server/integrations/store/store.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Borradores y cotizaciones" };

/**
 * Borradores y cotizaciones (PBOS-DRAFTS-CORRECTIVE-001). Local drafts and quotes
 * over real catalog, customer and price data. Unknown prices read "No medido"
 * (never 0), currencies are never mixed, and converting creates a LOCAL order
 * projection with traceability — never a Shopify order, reservation or email.
 */
export default async function DraftsPage() {
  const res = await loadStore(() => listProducts(100));

  return (
    <div>
      <PageHeader
        eyebrow="Ventas"
        title="Borradores y cotizaciones"
        description="Preparar pedidos y cotizaciones antes de que sean reales — todo local."
        icon="file"
      >
        <StoreSourceBadge connected={res.connected} error={res.error} />
      </PageHeader>

      <Panel className="mb-6" icon="shield" title="Local, sin efectos reales">
        <p className="text-sm text-muted">
          Reutiliza catálogo, clientes y precios reales. Un precio desconocido se muestra{" "}
          <span className="font-medium text-foreground">No medido</span> (nunca 0), no se mezclan
          monedas y convertir crea una{" "}
          <span className="font-medium text-foreground">proyección de pedido local</span> trazable —
          no un pedido Shopify, no reserva inventario y no envía correos. Exportar no es envío al
          cliente.
        </p>
      </Panel>

      <DraftsBoard products={res.data ?? []} connected={res.connected} />
    </div>
  );
}
