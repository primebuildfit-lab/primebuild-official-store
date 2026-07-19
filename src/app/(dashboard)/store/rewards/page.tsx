import type { Metadata } from "next";
import { Panel, StatusDot, StoreNotConnected } from "@/components/ds";
import { ModuleHeader, StoreSourceBadge } from "@/components/os/module-header";
import { isStoreConnected, storeDisplayDomain } from "@/server/integrations/store/config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "PB Coins · Store" };

function DefRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/50 py-1.5 last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

export default function StoreRewardsPage() {
  const connected = isStoreConnected();
  const domain = storeDisplayDomain();

  return (
    <div>
      <ModuleHeader id="store-rewards">
        <StoreSourceBadge connected={connected} />
      </ModuleHeader>

      <Panel className="mb-6" icon="coins" title="Programa PB Coins">
        <p className="max-w-2xl text-sm text-muted">
          PB Coins es el programa de recompensas de la tienda oficial{" "}
          <span className="font-mono text-xs">{domain ?? "primebuildfit"}</span>. Los clientes ganan y
          canjean puntos en la tienda; los saldos los administra el <b>backend de rewards</b> (la app{" "}
          <span className="font-mono text-xs">priembuild-core</span> en Railway), no esta app.
        </p>
        <p className="mt-2 text-xs text-faint">
          PrimeBuild Official Store muestra esta información en solo lectura y no inventa saldos ni
          movimientos de puntos.
        </p>
      </Panel>

      <Panel icon="activity" title="Estado de la conexión">
        <dl className="grid gap-x-8 text-sm sm:grid-cols-2">
          <DefRow label="Tienda oficial">
            <span className="inline-flex items-center gap-1.5">
              <StatusDot tone={connected ? "ok" : "warn"} live={connected} />
              {connected ? "Conectada (solo lectura)" : "No conectada"}
            </span>
          </DefRow>
          <DefRow label="Dominio">
            <span className="font-mono text-xs">{domain ?? "—"}</span>
          </DefRow>
          <DefRow label="Backend de puntos">
            <span className="font-mono text-xs">priembuild-core (Railway)</span>
          </DefRow>
        </dl>
      </Panel>

      {!connected ? (
        <div className="mt-6">
          <StoreNotConnected />
        </div>
      ) : null}
    </div>
  );
}
