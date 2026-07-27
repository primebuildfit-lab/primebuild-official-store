"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ActivityTimeline,
  Badge,
  ExternalLinkAction,
  HonestState,
  SegmentedControl,
  StatusDot,
  type TabOption,
} from "@/components/ds";
import { useVersionedCollection, useLocalCollection, useLedger } from "@/lib/local-collection";
import {
  INVENTORY_SCHEMA_VERSION,
  deriveBalances,
  isMovement,
  type InventoryMovement,
} from "@/lib/inventory";
import {
  ALLOWED_DIRECTIONS,
  DEFAULT_MAPPINGS,
  DIRECTION_LABEL,
  SHOPIFY_SCHEMA_VERSION,
  mergeMappings,
  verifiedPublicUrl,
  type MappingOverride,
  type SyncConflict,
  type SyncDirection,
} from "@/lib/shopify-center";
import type { StoreOverview } from "@/server/integrations/store/store.service";

/**
 * The Shopify center (PBOS-001 · ORDEN 16). An honest hub: connection is asserted
 * only from functional evidence, ownership is per-field (no generic bidirectional),
 * PrimeBuild physical inventory is kept apart from the Shopify observed quantity,
 * external links use verified URLs only, and every remote-effect action is
 * blocked in this phase. Conflicts/events start empty — nothing is invented.
 */

const isOverride = (x: unknown): x is MappingOverride =>
  x !== null && typeof x === "object" && typeof (x as MappingOverride).id === "string";

const TABS: TabOption[] = [
  { value: "resumen", label: "Resumen" },
  { value: "conexion", label: "Conexión" },
  { value: "propiedad", label: "Propiedad de datos" },
  { value: "productos", label: "Productos" },
  { value: "inventario", label: "Inventario" },
  { value: "pedidos", label: "Pedidos" },
  { value: "clientes", label: "Clientes" },
  { value: "webhooks", label: "Webhooks y eventos" },
  { value: "conflictos", label: "Conflictos" },
  { value: "actividad", label: "Actividad" },
  { value: "acceso", label: "Acceso directo" },
];

export function ShopifyCenter({
  connected,
  overview,
  primaryUrl,
}: {
  connected: boolean;
  overview: StoreOverview | null;
  primaryUrl: string | null;
}) {
  const [tab, setTab] = useState("resumen");
  const overrides = useVersionedCollection<MappingOverride>(
    "shopify:mappings",
    SHOPIFY_SCHEMA_VERSION,
    isOverride,
  );
  const conflicts = useLocalCollection<SyncConflict>("shopify:conflicts");
  const ledger = useLedger<InventoryMovement>(
    "inventory:movements",
    INVENTORY_SCHEMA_VERSION,
    isMovement,
  );

  const mappings = useMemo(
    () => mergeMappings(DEFAULT_MAPPINGS, overrides.items),
    [overrides.items],
  );
  const balances = useMemo(() => deriveBalances(ledger.entries), [ledger.entries]);
  const publicUrl = verifiedPublicUrl(primaryUrl);

  function setDirection(id: string, direction: SyncDirection) {
    const existing = overrides.items.find((o) => o.id === id);
    if (existing) overrides.update(id, { direction });
    else overrides.add({ id, direction });
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-surface/50 px-3 py-2 text-sm">
        <StatusDot tone={connected ? "ok" : "warn"} live={connected} />
        <span className="font-medium">
          {connected ? "Conectado (lectura verificada)" : "Shopify no conectado"}
        </span>
        <span className="text-faint">· la conexión se afirma solo con evidencia funcional</span>
      </div>

      <SegmentedControl options={TABS} value={tab} onChange={setTab} className="mb-4 flex-wrap" />

      {tab === "resumen" ? <Resumen connected={connected} overview={overview} /> : null}
      {tab === "conexion" ? <Conexion connected={connected} /> : null}
      {tab === "propiedad" ? <Propiedad mappings={mappings} onDirection={setDirection} /> : null}
      {tab === "productos" ? (
        <LinkTab
          connected={connected}
          label="productos"
          href="/store/products"
          count={overview?.productCount}
        />
      ) : null}
      {tab === "inventario" ? <Inventario balances={balances} /> : null}
      {tab === "pedidos" ? (
        <LinkTab
          connected={connected}
          label="pedidos"
          href="/store/orders"
          count={overview?.recentOrderCount}
        />
      ) : null}
      {tab === "clientes" ? (
        <LinkTab
          connected={connected}
          label="clientes"
          href="/store/customers"
          count={overview?.customerCount}
        />
      ) : null}
      {tab === "webhooks" ? (
        <HonestState
          icon="activity"
          title="Sin webhooks ni eventos registrados."
          description="Los webhooks/eventos requieren una conexión real. No se crean eventos de demostración; cuando existan, se registrarán con idempotency key, correlationId, reintentos, resultado y errores."
        />
      ) : null}
      {tab === "conflictos" ? <Conflictos conflicts={conflicts.items} /> : null}
      {tab === "actividad" ? (
        <ActivityTimeline events={[]} emptyMessage="Sin actividad de sincronización." />
      ) : null}
      {tab === "acceso" ? <Acceso publicUrl={publicUrl} /> : null}
    </div>
  );
}

function Resumen({ connected, overview }: { connected: boolean; overview: StoreOverview | null }) {
  if (!connected || !overview) {
    return (
      <HonestState
        icon="plug"
        tone="warn"
        title="Shopify no conectado."
        description={
          <div className="flex flex-col gap-2">
            <p>
              La presencia de variables de entorno, documentación o URLs antiguas no prueba una
              conexión. Solo se muestra conectado con una lectura funcional verificada.
            </p>
            <ul className="ml-4 list-disc text-xs text-faint">
              <li>Se intercambiarían: pedidos públicos, estado de pago observado, publicación.</li>
              <li>
                No se compartirían: proveedores, costos, MOQ, inventario físico, dañado, cuarentena.
              </li>
              <li>
                Requiere: credenciales del Admin API con permisos de lectura y, para escribir,
                autorización explícita (bloqueada en esta fase).
              </li>
            </ul>
          </div>
        }
      />
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Tienda" value={overview.shopName} />
      <Field label="Dominio" value={overview.domain} mono />
      <Field label="Moneda" value={overview.currency} />
      <Field label="Plan" value={overview.planName ?? "—"} />
      <Field label="Productos" value={String(overview.productCount)} />
      <Field label="Clientes" value={String(overview.customerCount)} />
    </div>
  );
}

function Conexion({ connected }: { connected: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-border bg-surface/50 p-3 text-sm">
        <p className="mb-1 font-medium">
          Estado: {connected ? "Conectado (lectura verificada)" : "No conectado"}
        </p>
        <p className="text-xs text-muted">
          Conectó: {connected ? "credenciales del entorno (solo lectura)" : "nadie"}. Los tokens
          nunca se muestran ni se registran.
        </p>
      </div>
      <button
        type="button"
        disabled
        title="OAuth live está bloqueado en esta fase."
        className="w-fit cursor-not-allowed rounded-lg border border-border px-3 py-1.5 text-xs text-faint opacity-60"
      >
        Conectar (OAuth) — bloqueado
      </button>
      <p className="text-xs text-faint">
        Checklist previo: definir tienda y cuenta propietaria, scopes de lectura, autoridad por
        campo, y una decisión explícita antes de habilitar cualquier escritura.
      </p>
    </div>
  );
}

function Propiedad({
  mappings,
  onDirection,
}: {
  mappings: ReturnType<typeof mergeMappings>;
  onDirection: (id: string, d: SyncDirection) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs text-muted">
        Autoridad por campo. No existe bidireccionalidad genérica: cada campo declara su dirección.
      </p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted/40 text-left text-[0.64rem] uppercase tracking-wider text-faint">
              <th className="px-3 py-2 font-semibold">Entidad</th>
              <th className="px-3 py-2 font-semibold">Campo</th>
              <th className="px-3 py-2 font-semibold">Fuente canónica</th>
              <th className="px-3 py-2 font-semibold">Dirección</th>
              <th className="px-3 py-2 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((m) => (
              <tr key={m.id} className="border-b border-border/50 last:border-0">
                <td className="px-3 py-2">{m.entity}</td>
                <td className="px-3 py-2 font-medium">{m.field}</td>
                <td className="px-3 py-2">
                  <Badge kind={m.canonicalSource === "Pendiente" ? "warning" : "neutral"}>
                    {m.canonicalSource}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={m.direction}
                    onChange={(e) => onDirection(m.id, e.target.value as SyncDirection)}
                    className="rounded border border-border bg-surface px-1.5 py-1 text-xs outline-none"
                  >
                    {ALLOWED_DIRECTIONS.map((d) => (
                      <option key={d} value={d}>
                        {DIRECTION_LABEL[d]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <span className="text-xs text-faint">{m.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[0.68rem] text-faint">
        Guardado local. Cambiar la dirección no ejecuta ninguna sincronización.
      </p>
    </div>
  );
}

function LinkTab({
  connected,
  label,
  href,
  count,
}: {
  connected: boolean;
  label: string;
  href: string;
  count?: number;
}) {
  if (!connected) {
    return (
      <HonestState
        icon="plug"
        tone="warn"
        title={`Shopify no conectado — sin ${label}.`}
        description="No se inventan datos. Conecta la tienda para leer en solo lectura."
      />
    );
  }
  return (
    <div className="rounded-xl border border-border bg-surface/50 p-4 text-sm">
      <p className="mb-2">
        {count != null ? <span className="font-semibold tabular-nums">{count}</span> : "—"} {label}{" "}
        (solo lectura).
      </p>
      <Link href={href} className="text-accent hover:underline">
        Abrir {label} →
      </Link>
    </div>
  );
}

function Inventario({ balances }: { balances: ReturnType<typeof deriveBalances> }) {
  const physical = balances.reduce((a, b) => a + b.physical, 0);
  const onHand = balances.reduce((a, b) => a + b.onHand, 0);
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Field label="Físico PrimeBuild" value={String(physical)} />
      <Field label="Disponible (ok)" value={String(onHand)} />
      <Field label="Publicable" value="Fórmula no definida" />
      <Field label="Observado en Shopify" value="No leído" />
      <p className="col-span-full text-xs text-faint">
        La cantidad observada en Shopify no es el inventario físico local. No se publica inventario
        físico completo.
      </p>
    </div>
  );
}

function Conflictos({ conflicts }: { conflicts: SyncConflict[] }) {
  if (conflicts.length === 0) {
    return (
      <HonestState
        icon="alert"
        title="Sin conflictos de sincronización."
        description="Los conflictos se registran con valor local/remoto, fechas, autoridad, impacto y propuesta; resolver crea historial y nunca se borra en silencio. Las resoluciones con efecto remoto están bloqueadas en esta fase."
      />
    );
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {conflicts.map((c) => (
        <li key={c.id} className="rounded-lg border border-border px-3 py-2 text-sm">
          <span className="font-medium">
            {c.entity} · {c.field}
          </span>{" "}
          — <span className="text-muted">{c.status}</span>
        </li>
      ))}
    </ul>
  );
}

function Acceso({ publicUrl }: { publicUrl: string | null }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <ExternalLinkAction
          href={publicUrl}
          system="la tienda pública"
          disabledReason="URL de Shopify no verificada"
        >
          Abrir tienda pública
        </ExternalLinkAction>
        <ExternalLinkAction
          href={null}
          system="Shopify Admin"
          disabledReason="URL de Shopify no verificada"
        >
          Abrir Shopify Admin
        </ExternalLinkAction>
      </div>
      <p className="text-xs text-faint">
        Solo se abre una URL HTTPS real, verificada y sin credenciales. No se fabrica una URL de
        admin desde el nombre de la tienda.
      </p>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <p className="text-[0.62rem] uppercase tracking-wide text-faint">{label}</p>
      <p className={`mt-0.5 ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
    </div>
  );
}
