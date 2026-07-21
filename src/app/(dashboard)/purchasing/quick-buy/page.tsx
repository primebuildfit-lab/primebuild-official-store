import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { StoreSourceBadge } from "@/components/os/module-header";
import { QuickBuy } from "@/components/os/quick-buy";
import { loadStore } from "@/server/integrations/store/load";
import { listProducts } from "@/server/integrations/store/store.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Compra rápida" };

/**
 * Compra rápida (PBOS-001 · ORDEN 7) — the manual-first purchase planner and the
 * differentiating core of the admin. It plans large purchases without opening
 * each product: add real products, paste SKUs, edit quantities/units, validate
 * MOQ and multiples, total by supplier and warehouse, and save/reopen drafts
 * locally. Saving sends nothing and changes no inventory or Shopify.
 */
export default async function QuickBuyPage() {
  const res = await loadStore(() => listProducts(100));

  return (
    <div>
      <PageHeader
        eyebrow="Compras"
        title="Compra rápida"
        description="Prepara compras grandes por cantidad, sin abrir producto por producto."
        icon="bolt"
      >
        <StoreSourceBadge connected={res.connected} error={res.error} />
      </PageHeader>

      <Panel className="mb-6" icon="shield" title="Manual-first, sin efectos reales">
        <p className="text-sm text-muted">
          Todo aquí es un borrador local. Guardar o exportar{" "}
          <span className="font-medium text-foreground">no</span> envía una orden, no contacta
          proveedores, no reserva unidades y no cambia inventario ni Shopify. Los SKU pegados que no
          se reconozcan se conservan marcados, sin crear productos. Los subtotales solo usan costos
          conocidos y no mezclan monedas.
        </p>
      </Panel>

      <QuickBuy products={res.data ?? []} connected={res.connected} />
    </div>
  );
}
