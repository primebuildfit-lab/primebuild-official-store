import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { IntegrationsBoard } from "@/components/os/integrations-board";
import { loadStore } from "@/server/integrations/store/load";
import { storeOverview } from "@/server/integrations/store/store.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Integraciones" };

/**
 * Integraciones (PBOS-001 · ORDEN 25). An honest registry of Official Store's own
 * integrations. Connection is asserted only from evidence (Shopify state from a
 * real read); secrets are never shown; Platform Nexus, CoinOS and EAL are linked
 * as responsible systems, never duplicated.
 */
export default async function IntegrationsPage() {
  const res = await loadStore(() => storeOverview());
  const shopifyConnected = res.connected && res.data != null;

  return (
    <div>
      <PageHeader
        eyebrow="Control"
        title="Integraciones"
        description="Registro honesto de integraciones propias, con estado y evidencia."
        icon="plug"
      />

      <Panel className="mb-6" icon="shield" title="Contrato o evidencia, nunca por suposición">
        <p className="text-sm text-muted">
          Solo aparecen integraciones con contrato, configuración o evidencia real. Una variable de
          entorno, un documento, un componente o una URL histórica{" "}
          <span className="font-medium text-foreground">no</span> equivalen a conexión. No se
          muestran secretos. Platform Nexus (identidad/seguridad), CoinOS (finanzas) y EAL (acceso
          transversal) se <span className="font-medium text-foreground">enlazan</span>, no se
          duplican.
        </p>
      </Panel>

      <IntegrationsBoard shopifyConnected={shopifyConnected} />
    </div>
  );
}
