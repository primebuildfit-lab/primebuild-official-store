"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  DataTable,
  HonestState,
  MoneyValue,
  SegmentedControl,
  SourceBadge,
  StoreNotConnected,
  type Column,
  type TabOption,
} from "@/components/ds";
import { useLocalCollection, localId } from "@/lib/local-collection";
import { isUnpriced, validatePriceList, type LocalPriceList } from "@/lib/pricing";
import type { StoreProduct } from "@/server/integrations/store/store.service";

/**
 * Precios y listas (PBOS-001 · ORDEN 5). Manages SALE prices only — never
 * supplier costs. Shopify prices are the observed, read-only value; live price
 * edits stay blocked. Local price lists are operator-defined and persist locally,
 * each with a single currency (no mixing, no implicit conversion). An unknown
 * price shows "No medido"/"Precio no configurado", never 0.
 */

const VIEWS: TabOption[] = [
  { value: "actuales", label: "Precios actuales" },
  { value: "listas", label: "Listas de precios" },
  { value: "programados", label: "Cambios programados" },
  { value: "sin-precio", label: "Sin precio" },
  { value: "conflictos", label: "Conflictos Shopify" },
  { value: "historial", label: "Historial" },
];

function ObservedPrices({
  connected,
  products,
  onlyUnpriced,
}: {
  connected: boolean;
  products: StoreProduct[];
  onlyUnpriced?: boolean;
}) {
  if (!connected) return <StoreNotConnected />;
  const rows = onlyUnpriced ? products.filter((p) => isUnpriced(p.price)) : products;

  const columns: Column<StoreProduct>[] = [
    {
      key: "title",
      header: "Producto",
      render: (r) => <span className="font-medium">{r.title}</span>,
    },
    {
      key: "price",
      header: "Precio observado",
      align: "right",
      render: (r) =>
        isUnpriced(r.price) ? (
          <span className="text-faint">Precio no configurado</span>
        ) : (
          <MoneyValue amount={Number(r.price)} currency={r.currency} />
        ),
    },
    {
      key: "authority",
      header: "Autoridad",
      render: () => <Badge kind="neutral">Shopify · solo lectura</Badge>,
    },
    {
      key: "src",
      header: "Fuente",
      render: () => <SourceBadge source="Shopify" verification="unverified" />,
    },
    {
      key: "edit",
      header: "",
      align: "right",
      render: () => (
        <button
          type="button"
          disabled
          title="La edición de precio en Shopify está bloqueada en esta fase. Requiere lista de precios con persistencia y autorización."
          className="cursor-not-allowed rounded-lg border border-border px-2.5 py-1 text-xs text-faint opacity-60"
        >
          Editar
        </button>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getKey={(r) => r.id}
      emptyMessage={onlyUnpriced ? "No hay productos sin precio." : "La tienda no tiene productos."}
      caption={
        <>
          <span>Precio observado en Shopify · solo lectura</span>
          <span className="tabular-nums">{rows.length} productos</span>
        </>
      }
    />
  );
}

function PriceLists() {
  const lists = useLocalCollection<LocalPriceList>("pricing:lists");
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add() {
    const parsed = validatePriceList(lists.items, { name, currency });
    if (!parsed.ok) return setError(parsed.error ?? "No válido.");
    lists.add({
      id: localId(),
      name: name.trim(),
      currency: currency.trim().toUpperCase(),
      status: "borrador",
    });
    setName("");
    setCurrency("");
    setError(null);
  }

  const columns: Column<LocalPriceList>[] = [
    { key: "name", header: "Lista", render: (r) => <span className="font-medium">{r.name}</span> },
    {
      key: "currency",
      header: "Moneda",
      render: (r) => <Badge kind="neutral">{r.currency}</Badge>,
    },
    { key: "status", header: "Estado", render: (r) => <Badge kind="neutral">{r.status}</Badge> },
    { key: "src", header: "Fuente", render: () => <Badge kind="neutral">Local</Badge> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <button
          type="button"
          onClick={() => lists.remove(r.id)}
          className="text-xs text-muted hover:text-foreground"
        >
          Eliminar
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-border bg-surface/50 p-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Nombre
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="p. ej. Mayoreo"
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Moneda (ISO)
          <input
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            placeholder="USD"
            maxLength={3}
            className="w-24 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <button
          type="button"
          onClick={add}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Crear lista
        </button>
        <span className="ml-auto text-[0.68rem] text-faint">
          Guardado local · una moneda por lista, sin conversión
        </span>
      </div>
      {error ? <p className="mb-3 text-xs text-warn">{error}</p> : null}
      <DataTable
        columns={columns}
        rows={lists.items}
        getKey={(r) => r.id}
        emptyMessage="Aún no hay listas de precios. Créalas arriba; se guardan localmente."
      />
    </div>
  );
}

export function PricingBoard({
  connected,
  products,
}: {
  connected: boolean;
  products: StoreProduct[];
}) {
  const [view, setView] = useState("actuales");
  const unpricedCount = useMemo(
    () => products.filter((p) => isUnpriced(p.price)).length,
    [products],
  );

  return (
    <div>
      <SegmentedControl
        options={VIEWS}
        value={view}
        onChange={setView}
        className="mb-4 flex-wrap"
      />

      {view === "actuales" ? <ObservedPrices connected={connected} products={products} /> : null}
      {view === "listas" ? <PriceLists /> : null}
      {view === "sin-precio" ? (
        <ObservedPrices connected={connected} products={products} onlyUnpriced />
      ) : null}
      {view === "programados" ? (
        <HonestState
          icon="activity"
          title="Sin cambios de precio programados."
          description="Los cambios programados requieren una lista de precios con persistencia y autorización. Aún no hay ninguno."
        />
      ) : null}
      {view === "conflictos" ? (
        <HonestState
          icon="alert"
          tone="warn"
          title="No hay conflictos de precio que resolver."
          description="Un conflicto compara el precio autoritativo de PrimeBuild con el observado en Shopify. Requiere una lista de precios autoritativa; aún no existe."
        />
      ) : null}
      {view === "historial" ? (
        <HonestState
          icon="activity"
          title="Sin historial de precios todavía."
          description="El historial registrará cambios reales de precio con actor, fecha y versión. No se inventan cambios."
        />
      ) : null}

      {view === "sin-precio" && connected ? (
        <p className="mt-2 text-xs text-faint">{unpricedCount} productos sin precio configurado.</p>
      ) : null}
    </div>
  );
}
