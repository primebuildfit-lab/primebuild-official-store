"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  DetailDrawer,
  Icon,
  MoneyValue,
  QuantityValue,
  SegmentedControl,
  SourceBadge,
  type BadgeKind,
  type TabOption,
} from "@/components/ds";
import type { StoreProduct } from "@/server/integrations/store/store.service";

/**
 * The canonical product catalog (PBOS-001 · ORDEN 3). It keeps three planes
 * distinct — the internal product (canonical), its Shopify publication, and
 * inventory — and reads ONLY real data. There is no internal catalog store yet,
 * so today the rows are a read-only projection of Shopify: no product is
 * invented, and creating/editing is disabled (Official Store never writes to
 * Shopify). Internal-only views (supplier/cost/conflict) say honestly that they
 * need the internal catalog rather than showing a fake result.
 */

const SHOPIFY_STATUS: Record<string, { kind: BadgeKind; label: string }> = {
  ACTIVE: { kind: "healthy", label: "Publicado" },
  DRAFT: { kind: "warning", label: "Borrador" },
  ARCHIVED: { kind: "neutral", label: "Archivado" },
};

const VIEWS: TabOption[] = [
  { value: "todos", label: "Todos" },
  { value: "activos", label: "Activos" },
  { value: "borradores", label: "Borradores" },
  { value: "archivados", label: "Archivados" },
  { value: "sin-inventario", label: "Sin inventario" },
  { value: "sin-proveedor", label: "Sin proveedor" },
  { value: "sin-costo", label: "Sin costo" },
  { value: "con-conflicto", label: "Con conflicto Shopify" },
];

/** Views that need the internal catalog store, which does not exist yet. */
const INTERNAL_ONLY = new Set(["sin-proveedor", "sin-costo", "con-conflicto"]);

function filterView(products: StoreProduct[], view: string): StoreProduct[] {
  switch (view) {
    case "activos":
      return products.filter((p) => p.status === "ACTIVE");
    case "borradores":
      return products.filter((p) => p.status === "DRAFT");
    case "archivados":
      return products.filter((p) => p.status === "ARCHIVED");
    case "sin-inventario":
      return products.filter((p) => p.totalInventory != null && p.totalInventory <= 0);
    default:
      return products;
  }
}

function shopifyBadge(status: string) {
  const s = SHOPIFY_STATUS[status] ?? { kind: "neutral" as BadgeKind, label: status };
  return <Badge kind={s.kind}>{s.label}</Badge>;
}

export function ProductsCatalog({ products }: { products: StoreProduct[] }) {
  const [view, setView] = useState("todos");
  const [selected, setSelected] = useState<StoreProduct | null>(null);

  const rows = useMemo(() => filterView(products, view), [products, view]);
  const internalOnly = INTERNAL_ONLY.has(view);

  return (
    <div>
      <SegmentedControl
        options={VIEWS}
        value={view}
        onChange={setView}
        className="mb-4 flex-wrap"
      />

      {internalOnly ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface/40 p-10 text-center">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface-muted text-faint">
            <Icon name="box" size={18} />
          </span>
          <p className="text-sm font-medium text-muted">Requiere el catálogo interno.</p>
          <p className="max-w-md text-xs text-faint">
            Proveedor, costo y conflictos de sincronización viven en el catálogo interno, que aún no
            tiene almacenamiento. Hoy el catálogo es una proyección de solo lectura de Shopify.
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/40 p-10 text-center text-sm text-muted">
          Sin productos en esta vista.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted/40 text-left text-[0.68rem] uppercase tracking-wider text-faint">
                  <th className="px-4 py-2.5 font-semibold">Producto</th>
                  <th className="px-4 py-2.5 font-semibold">Shopify</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Inventario</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Precio</th>
                  <th className="px-4 py-2.5 font-semibold">Proveedor</th>
                  <th className="px-4 py-2.5 text-right font-semibold" />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border/50 transition-colors last:border-0 hover:bg-surface-muted/40"
                  >
                    <td className="px-4 py-2.5 align-middle font-medium">{p.title}</td>
                    <td className="px-4 py-2.5 align-middle">{shopifyBadge(p.status)}</td>
                    <td className="px-4 py-2.5 text-right align-middle tabular-nums">
                      <QuantityValue value={p.totalInventory} unit="uds" />
                    </td>
                    <td className="px-4 py-2.5 text-right align-middle tabular-nums">
                      <MoneyValue amount={Number(p.price)} currency={p.currency} />
                    </td>
                    <td className="px-4 py-2.5 align-middle text-faint">No medido</td>
                    <td className="px-4 py-2.5 text-right align-middle">
                      <button
                        type="button"
                        onClick={() => setSelected(p)}
                        className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border/70 px-4 py-2 text-[0.7rem] text-faint">
            <span>Proyección de solo lectura · Admin API de Shopify</span>
            <span className="tabular-nums">{rows.length} productos</span>
          </div>
        </div>
      )}

      <DetailDrawer
        open={selected != null}
        onClose={() => setSelected(null)}
        title={selected?.title}
        description="Detalle de solo lectura"
        footer={
          <button
            type="button"
            disabled
            title="Edición deshabilitada: no hay catálogo interno con persistencia y Official Store nunca escribe en Shopify."
            className="cursor-not-allowed rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-faint opacity-60"
          >
            Editar
          </button>
        }
      >
        {selected ? (
          <div className="flex flex-col gap-5">
            <section>
              <p className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-faint">
                Producto interno (canónico)
              </p>
              <p className="text-sm font-medium">{selected.title}</p>
              <p className="mt-1 text-xs text-muted">
                El catálogo interno aún no tiene almacenamiento propio: hoy este producto es una
                proyección de solo lectura de Shopify.
              </p>
            </section>

            <section>
              <p className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-faint">
                Publicación en Shopify
              </p>
              <div className="flex items-center gap-2">
                {shopifyBadge(selected.status)}
                <SourceBadge source="Shopify" verification="unverified" />
              </div>
            </section>

            <section className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-faint">
                  Inventario
                </p>
                <QuantityValue value={selected.totalInventory} unit="uds" />
                <p className="mt-0.5 text-[0.68rem] text-faint">Solo lectura · Shopify</p>
              </div>
              <div>
                <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-faint">
                  Precio
                </p>
                <MoneyValue amount={Number(selected.price)} currency={selected.currency} />
                <p className="mt-0.5 text-[0.68rem] text-faint">Shopify</p>
              </div>
              <div>
                <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-faint">
                  Costo
                </p>
                <MoneyValue amount={null} currency={null} />
                <p className="mt-0.5 text-[0.68rem] text-faint">Requiere catálogo interno</p>
              </div>
              <div>
                <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-faint">
                  Margen
                </p>
                <MoneyValue amount={null} currency={null} />
                <p className="mt-0.5 text-[0.68rem] text-faint">Requiere costo y precio</p>
              </div>
            </section>
          </div>
        ) : null}
      </DetailDrawer>
    </div>
  );
}
