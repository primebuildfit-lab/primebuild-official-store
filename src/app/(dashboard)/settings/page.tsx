import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ds";
import { StoreSourceBadge } from "@/components/os/module-header";
import { SettingsHub } from "@/components/os/settings-hub";
import { app } from "@/config/app";
import { isStoreConnected } from "@/server/integrations/store/config";
import { INVENTORY_SCHEMA_VERSION } from "@/lib/inventory";
import { WAREHOUSE_SCHEMA_VERSION } from "@/lib/warehouses";
import { TRANSFER_SCHEMA_VERSION } from "@/lib/transfers";
import { RETURNS_SCHEMA_VERSION } from "@/lib/returns";
import { FULFILLMENT_SCHEMA_VERSION } from "@/lib/fulfillment";
import { ORDERS_SCHEMA_VERSION } from "@/lib/orders";
import { STORE_DEF_SCHEMA_VERSION } from "@/lib/store-definition";
import { AUTOMATIONS_SCHEMA_VERSION } from "@/lib/automations";
import { SETTINGS_SCHEMA_VERSION } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Configuración" };

/**
 * Configuración (PBOS-001 · ORDEN 28). Only Official Store's own settings. The
 * operator settings are persistent, validated, versioned, audited and reversible;
 * business decisions are listed as pending, never invented; and identifier, keys,
 * updater and channel are shown as observed and never changed here.
 */
export default function SettingsPage() {
  const connected = isStoreConnected();

  const diagnostics = {
    version: app.version,
    identifier: "com.primebuild.store",
    channel: "store-latest (observado)",
    shopifyConnected: connected,
    schemas: [
      { name: "inventory", v: INVENTORY_SCHEMA_VERSION },
      { name: "warehouses", v: WAREHOUSE_SCHEMA_VERSION },
      { name: "transfers", v: TRANSFER_SCHEMA_VERSION },
      { name: "returns", v: RETURNS_SCHEMA_VERSION },
      { name: "fulfillment", v: FULFILLMENT_SCHEMA_VERSION },
      { name: "orders", v: ORDERS_SCHEMA_VERSION },
      { name: "store-def", v: STORE_DEF_SCHEMA_VERSION },
      { name: "automations", v: AUTOMATIONS_SCHEMA_VERSION },
      { name: "settings", v: SETTINGS_SCHEMA_VERSION },
    ],
  };

  return (
    <div>
      <PageHeader
        eyebrow="Control"
        title="Configuración"
        description="Configuración propia de Official Store, versionada y auditada."
        icon="settings"
      >
        <StoreSourceBadge connected={connected} />
      </PageHeader>

      <Panel className="mb-6" icon="shield" title="Sin inventar decisiones del negocio">
        <p className="text-sm text-muted">
          Solo la configuración propia de Official Store. Las opciones críticas son{" "}
          <span className="font-medium text-foreground">
            persistentes, validadas, versionadas, auditadas y reversibles
          </span>{" "}
          (con diff). Las decisiones del negocio (moneda base, países, almacenes, impuestos,
          transportistas, fórmula de disponibilidad, política de reserva o publicación) no se
          inventan: se listan como pendientes. Identifier, claves, updater y canal se muestran como
          observados y no se cambian aquí; sin migraciones live.
        </p>
      </Panel>

      <SettingsHub diagnostics={diagnostics} />
    </div>
  );
}
