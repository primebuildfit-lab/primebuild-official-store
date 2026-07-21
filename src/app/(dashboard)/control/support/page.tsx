import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { SupportBoard } from "@/components/os/support-board";
import { app } from "@/config/app";

export const metadata: Metadata = { title: "Soporte" };

/**
 * Soporte (PBOS-001 · ORDEN 29). The single, last entry. Contextual help links to
 * real routes; there is no ticket backend, so tickets are only prepared or
 * exported locally (nothing is sent) and agents/SLA are never invented; safe
 * diagnostics declare inclusions/exclusions and carry no secrets.
 */
export default function SupportPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Control"
        title="Soporte"
        description="Ayuda, diagnóstico seguro y solicitudes — sin inventar tickets ni agentes."
        icon="help"
      />

      <Panel className="mb-6" icon="shield" title="Última entrada, honesta">
        <p className="text-sm text-muted">
          Soporte es la <span className="font-medium text-foreground">única y última</span> entrada
          del panel. No hay backend de tickets: no se inventan tickets, agentes ni SLA y nada se
          envía — solo se puede{" "}
          <span className="font-medium text-foreground">preparar o exportar</span> una solicitud
          localmente. El diagnóstico seguro declara qué incluye y excluye y no contiene secretos ni
          datos personales innecesarios.
        </p>
      </Panel>

      <SupportBoard version={app.version} />
    </div>
  );
}
