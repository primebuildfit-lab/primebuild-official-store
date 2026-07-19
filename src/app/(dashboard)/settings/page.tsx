import type { Metadata } from "next";
import { Card, Panel } from "@/components/ds";
import { ModuleHeader, StoreSourceBadge } from "@/components/os/module-header";
import { app } from "@/config/app";
import {
  isStoreConnected,
  storeDisplayDomain,
  STORE_API_VERSION_DEFAULT,
} from "@/server/integrations/store/config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Configuración" };

export default function SettingsPage() {
  const connected = isStoreConnected();
  const domain = storeDisplayDomain();
  const apiVersion = process.env.SHOPIFY_API_VERSION?.trim() || STORE_API_VERSION_DEFAULT;

  const rows: Array<[string, string]> = [
    ["Aplicación", app.name],
    ["Versión", app.version],
    ["Tienda oficial", connected ? "Conectada (solo lectura)" : "No conectada"],
    ["Dominio de la tienda", domain ?? "—"],
    ["Versión del Admin API", connected ? apiVersion : "—"],
  ];

  return (
    <div>
      <ModuleHeader id="settings">
        <StoreSourceBadge connected={connected} />
      </ModuleHeader>

      <Panel className="mb-6" icon="settings" title="Entorno">
        <dl className="grid gap-x-8 text-sm sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div
              key={k}
              className="flex items-center justify-between gap-3 border-b border-border/50 py-1.5"
            >
              <dt className="text-muted">{k}</dt>
              <dd className="text-right">{v}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Card className="border-dashed p-5">
        <h3 className="text-sm font-semibold">Conectar la tienda oficial</h3>
        <p className="mt-2 text-xs text-muted">
          Para leer la tienda en vivo (solo lectura), define estas variables en{" "}
          <span className="font-mono">.env</span> y reinicia la app:
        </p>
        <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-surface-muted/50 p-3 text-[0.72rem] text-muted">
{`SHOPIFY_STORE_DOMAIN="primebuildfit.myshopify.com"
SHOPIFY_ADMIN_ACCESS_TOKEN="shpat_********"   # token de solo lectura
SHOPIFY_API_VERSION="${STORE_API_VERSION_DEFAULT}"   # opcional`}
        </pre>
        <p className="mt-2 text-xs text-faint">
          El token nunca se muestra ni se registra. PrimeBuild Official Store nunca escribe en la
          tienda.
        </p>
      </Card>
    </div>
  );
}
