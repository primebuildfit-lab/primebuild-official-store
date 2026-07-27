"use client";

import { useState } from "react";
import {
  Badge,
  DataTable,
  Icon,
  SegmentedControl,
  StoreNotConnected,
  type Column,
  type TabOption,
} from "@/components/ds";
import { useLocalCollection, localId } from "@/lib/local-collection";
import {
  validateCategory,
  isDuplicateName,
  type CommercialCollection,
  type InternalCategory,
} from "@/lib/catalog";
import type { StoreCollection } from "@/server/integrations/store/store.service";

/**
 * Categorías y colecciones (PBOS-001 · ORDEN 4). Keeps three concepts distinct:
 * internal categories (organise the product inside PrimeBuild), commercial
 * collections (organise presentation), and Shopify collections (observed/synced
 * from Shopify, read-only). Plus tags and attributes. Internal categories and
 * commercial collections are operator-defined and persist LOCALLY (clearly
 * labelled); nothing is seeded. Shopify sync is disabled — this console never
 * writes to Shopify.
 */

const VIEWS: TabOption[] = [
  { value: "categorias", label: "Categorías internas" },
  { value: "comerciales", label: "Colecciones comerciales" },
  { value: "shopify", label: "Colecciones Shopify" },
  { value: "etiquetas", label: "Etiquetas" },
  { value: "atributos", label: "Atributos" },
];

function LocalBadge() {
  return (
    <Badge
      kind="neutral"
      title="Guardado localmente en este equipo, no en un servidor ni en Shopify"
    >
      Local
    </Badge>
  );
}

function InternalOnly({ what }: { what: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface/40 p-10 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface-muted text-faint">
        <Icon name="layers" size={18} />
      </span>
      <p className="text-sm font-medium text-muted">{what} requieren el catálogo interno.</p>
      <p className="max-w-md text-xs text-faint">
        {what} se derivan del catálogo interno de productos, que aún no tiene almacenamiento. No se
        inventan valores.
      </p>
    </div>
  );
}

function CategoriesTab() {
  const cats = useLocalCollection<InternalCategory>("catalog:categories");
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  function addCategory() {
    const parsed = validateCategory(cats.items, { name, parentId: parentId || null });
    if (!parsed.ok) {
      setError(parsed.error ?? "No válido.");
      return;
    }
    cats.add({ id: localId(), name: name.trim(), parentId: parentId || null, status: "activa" });
    setName("");
    setParentId("");
    setError(null);
  }

  const columns: Column<InternalCategory>[] = [
    {
      key: "name",
      header: "Categoría",
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: "parent",
      header: "Padre",
      render: (r) =>
        cats.items.find((c) => c.id === r.parentId)?.name ?? <span className="text-faint">—</span>,
    },
    { key: "status", header: "Estado", render: (r) => <Badge kind="neutral">{r.status}</Badge> },
    { key: "src", header: "Fuente", render: () => <LocalBadge /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <button
          type="button"
          onClick={() => cats.remove(r.id)}
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
            placeholder="p. ej. Suplementos"
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Padre (opcional)
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">— Ninguno —</option>
            {cats.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={addCategory}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Añadir categoría
        </button>
        <span className="ml-auto text-[0.68rem] text-faint">
          Guardado local · referencias canónicas, no copia de productos
        </span>
      </div>
      {error ? <p className="mb-3 text-xs text-warn">{error}</p> : null}
      <DataTable
        columns={columns}
        rows={cats.items}
        getKey={(r) => r.id}
        emptyMessage="Aún no hay categorías internas. Créalas arriba; se guardan localmente."
      />
    </div>
  );
}

function CommercialTab() {
  const cols = useLocalCollection<CommercialCollection>("catalog:commercial");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add() {
    const n = name.trim();
    if (!n) return setError("El nombre es obligatorio.");
    if (
      isDuplicateName(
        cols.items.map((c) => c.name),
        n,
      )
    )
      return setError("Ya existe una colección con ese nombre.");
    cols.add({ id: localId(), name: n, kind: "manual", status: "activa" });
    setName("");
    setError(null);
  }

  const columns: Column<CommercialCollection>[] = [
    {
      key: "name",
      header: "Colección",
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    { key: "kind", header: "Tipo", render: (r) => <Badge kind="neutral">{r.kind}</Badge> },
    { key: "status", header: "Estado", render: (r) => <Badge kind="neutral">{r.status}</Badge> },
    { key: "src", header: "Fuente", render: () => <LocalBadge /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <button
          type="button"
          onClick={() => cols.remove(r.id)}
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
            placeholder="p. ej. Novedades"
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <button
          type="button"
          onClick={add}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Añadir colección
        </button>
        <span className="ml-auto text-[0.68rem] text-faint">
          Guardado local · no publica en Shopify
        </span>
      </div>
      {error ? <p className="mb-3 text-xs text-warn">{error}</p> : null}
      <DataTable
        columns={columns}
        rows={cols.items}
        getKey={(r) => r.id}
        emptyMessage="Aún no hay colecciones comerciales. Créalas arriba; se guardan localmente."
      />
    </div>
  );
}

function ShopifyTab({
  connected,
  collections,
}: {
  connected: boolean;
  collections: StoreCollection[];
}) {
  if (!connected) return <StoreNotConnected />;
  const columns: Column<StoreCollection>[] = [
    {
      key: "title",
      header: "Colección",
      render: (r) => <span className="font-medium">{r.title}</span>,
    },
    {
      key: "handle",
      header: "Handle",
      render: (r) => <span className="font-mono text-xs text-muted">{r.handle}</span>,
    },
    {
      key: "products",
      header: "Productos",
      align: "right",
      render: (r) => (r.productsCount == null ? "—" : String(r.productsCount)),
    },
  ];
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-border bg-surface/50 px-3 py-2 text-xs text-muted">
        <span>Observado en Shopify · solo lectura</span>
        <button
          type="button"
          disabled
          title="La sincronización con Shopify está deshabilitada en esta fase."
          className="cursor-not-allowed rounded-lg border border-border px-2.5 py-1 text-faint opacity-60"
        >
          Sincronizar
        </button>
      </div>
      <DataTable
        columns={columns}
        rows={collections}
        getKey={(r) => r.id}
        emptyMessage="La tienda no tiene colecciones."
        caption={
          <>
            <span>Solo lectura · Admin API</span>
            <span className="tabular-nums">{collections.length} colecciones</span>
          </>
        }
      />
    </div>
  );
}

export function CatalogBoard({
  connected,
  collections,
}: {
  connected: boolean;
  collections: StoreCollection[];
}) {
  const [view, setView] = useState("categorias");
  return (
    <div>
      <SegmentedControl
        options={VIEWS}
        value={view}
        onChange={setView}
        className="mb-4 flex-wrap"
      />
      {view === "categorias" ? <CategoriesTab /> : null}
      {view === "comerciales" ? <CommercialTab /> : null}
      {view === "shopify" ? <ShopifyTab connected={connected} collections={collections} /> : null}
      {view === "etiquetas" ? <InternalOnly what="Las etiquetas" /> : null}
      {view === "atributos" ? <InternalOnly what="Los atributos" /> : null}
    </div>
  );
}
