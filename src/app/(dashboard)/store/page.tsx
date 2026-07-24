import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { StoreSourceBadge } from "@/components/os/module-header";
import { ShopifyCenter } from "@/components/os/shopify-center";
import { loadStore } from "@/server/integrations/store/load";
import { storeOverview } from "@/server/integrations/store/store.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shopify" };

/**
 * Shopify (PBOS-001 · ORDEN 16) — the honest Shopify integration center. Shopify
 * is an external channel, not another admin. Connection is asserted only from a
 * real successful read (functional evidence); ownership is per-field with no
 * generic bidirectional sync; PrimeBuild physical inventory is separate from the
 * Shopify observed quantity; external links use verified URLs only; and every
 * remote-effect action is blocked in this phase.
 */
export default async function StorePage() {
  const res = await loadStore(() => storeOverview());
  // Connection is TRUE only when a real read succeeded and returned data.
  const connected = res.connected && res.data != null;

  return (
    <div>
      <PageHeader
        eyebrow="Tienda online"
        title="Shopify"
        description="Centro de conexión, propiedad de datos, sincronización y acceso a la tienda."
        icon="store"
      >
        <StoreSourceBadge connected={connected} error={res.error} />
      </PageHeader>

      <Panel className="mb-6" icon="shield" title="Un canal externo, no otro Admin">
        <p className="text-sm text-muted">
          Shopify se integra como{" "}
          <span className="font-medium text-foreground">tienda pública y canal</span>, no como otra
          aplicación administrativa. La conexión se afirma solo con evidencia funcional; la
          autoridad es por campo (sin bidireccional genérico); el inventario físico de PrimeBuild no
          es la cantidad observada en Shopify; y en esta fase toda acción con efecto remoto (OAuth,
          webhooks, sincronización, publicación) está bloqueada.
        </p>
      </Panel>

      <ShopifyCenter
        connected={connected}
        overview={res.data ?? null}
        primaryUrl={res.data?.primaryUrl ?? null}
      />
    </div>
  );
}
