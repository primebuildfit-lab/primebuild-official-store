"use client";

import { useMemo, useState } from "react";
import { Badge, DataTable, DetailDrawer, type Column } from "@/components/ds";
import {
  buildIntegrations,
  integrationStateLabel,
  type IntegrationEntry,
  type IntegrationState,
} from "@/lib/integrations";

/**
 * Integraciones (PBOS-001 · ORDEN 25). An honest registry: connection is only ever
 * asserted from evidence, secrets are never shown, and Nexus/CoinOS/EAL are linked
 * as responsible systems rather than duplicated.
 */

const TONE: Partial<Record<IntegrationState, Parameters<typeof Badge>[0]["kind"]>> = {
  "conectada-verificada": "healthy",
  "conectada-sin-verificar": "info",
  "configuracion-parcial": "warning",
  "no-conectada": "neutral",
  "permisos-insuficientes": "warning",
  "fuente-no-disponible": "neutral",
  legacy: "neutral",
  "en-transicion": "info",
  error: "critical",
  "pendiente-decision": "warning",
};

export function IntegrationsBoard({ shopifyConnected }: { shopifyConnected: boolean }) {
  const items = useMemo(() => buildIntegrations(shopifyConnected), [shopifyConnected]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((i) => i.id === selectedId) ?? null;

  const columns: Column<IntegrationEntry>[] = [
    {
      key: "name",
      header: "Integración",
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    { key: "type", header: "Tipo", render: (r) => <span className="text-muted">{r.type}</span> },
    { key: "owner", header: "Propietario", render: (r) => r.owner },
    {
      key: "state",
      header: "Estado",
      render: (r) => (
        <Badge kind={TONE[r.state] ?? "neutral"}>{integrationStateLabel(r.state)}</Badge>
      ),
    },
    {
      key: "evidence",
      header: "Evidencia",
      render: (r) => <span className="text-xs text-faint">{r.evidence}</span>,
    },
    {
      key: "open",
      header: "",
      align: "right",
      render: (r) => (
        <button
          type="button"
          onClick={() => setSelectedId(r.id)}
          className="text-xs text-muted hover:text-foreground"
        >
          Abrir
        </button>
      ),
    },
  ];

  return (
    <div>
      <DataTable
        columns={columns}
        rows={items}
        getKey={(r) => r.id}
        caption={
          <>
            <span>Solo integraciones con contrato, configuración o evidencia · sin secretos</span>
            <span>{items.length}</span>
          </>
        }
      />

      {selected ? (
        <DetailDrawer
          open
          onClose={() => setSelectedId(null)}
          title={selected.name}
          description={selected.type}
        >
          <dl className="grid grid-cols-1 gap-2 text-sm">
            <Row
              k="Estado"
              v={
                <Badge kind={TONE[selected.state] ?? "neutral"}>
                  {integrationStateLabel(selected.state)}
                </Badge>
              }
            />
            <Row k="Propietario" v={selected.owner} />
            <Row k="Consumidor" v={selected.consumer} />
            <Row k="Entorno" v={selected.environment} />
            <Row k="Alcance" v={selected.scope} />
            <Row k="Capacidades" v={selected.capabilities} />
            <Row k="Permisos" v={selected.permissions} />
            <Row k="Credencial" v={selected.credentialRef} />
            <Row k="Evidencia" v={selected.evidence} />
          </dl>
          <p className="mt-3 text-sm text-muted">{selected.note}</p>
          {selected.link ? (
            <p className="mt-2 text-xs">
              <Badge kind={selected.link.kind === "enlace" ? "info" : "warning"}>
                {selected.link.label}
              </Badge>
            </p>
          ) : null}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              disabled
              title="Prueba de conexión no disponible sin integración real."
              className="cursor-not-allowed rounded-lg border border-border px-2.5 py-1.5 text-xs text-faint opacity-60"
            >
              Probar conexión
            </button>
          </div>
          <p className="mt-2 text-[0.66rem] text-faint">
            Una variable de entorno o un documento no equivalen a integración verificada. No se
            muestran secretos.
          </p>
        </DetailDrawer>
      ) : null}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/50 py-1.5 last:border-0">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}
