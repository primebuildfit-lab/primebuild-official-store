import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { MirrorCenter } from "@/components/os/mirror-center";
import { SyncCenter } from "@/components/os/sync-center";

export const metadata: Metadata = { title: "Espejo del catálogo" };

/**
 * ShopifyCatalogMirror (PBOS-DPB-MEGA-FABLE-001 §7-§9, §53). Shopify sigue
 * siendo la tienda de dropshipping; aquí solo se copia lo autorizado y el
 * stock del proveedor queda como observación. Nada se borra en Shopify.
 */
export default function MirrorPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Tienda online"
        title="Espejo del catálogo"
        description="Descubrimiento, plantillas y mapeo de variantes desde Shopify — solo lectura."
        icon="refresh"
      />
      <Panel className="mb-6" icon="shield" title="Frontera del espejo">
        <p className="text-sm text-muted">
          El stock del proveedor dropshipping se registra ÚNICAMENTE como{" "}
          <span className="font-medium text-foreground">observación</span>: la única vía de entrada al
          inventario propio es una recepción explícita en el ledger. Los conflictos por campo nunca se
          resuelven en silencio y no existen escrituras masivas destructivas.
        </p>
      </Panel>
      <SyncCenter />
      <div className="mt-6" />
      <MirrorCenter />
    </div>
  );
}
