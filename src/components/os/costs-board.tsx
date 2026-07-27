"use client";

import { useMemo, useState } from "react";
import { Badge, HonestState, MoneyValue, SegmentedControl, type TabOption } from "@/components/ds";
import { useLocalCollection } from "@/lib/local-collection";
import { orderSubtotal, orderTotal, type PurchaseOrder } from "@/lib/purchase-orders";
import { CALC_STATE_LABEL, computeLandedCost, computeMargin, costVariation } from "@/lib/costs";

/**
 * Costos y márgenes (PBOS-001 · ORDEN 23). Sale margins with transparent formulas.
 * Costs come from real local purchase orders. Every figure shows its state; landed
 * cost is always "estimado" (never "confirmado") while components are missing;
 * margins read "Fuente incompleta" (never 0) when price or a linking SKU is absent;
 * currencies are never mixed or converted. CoinOS balances are never touched.
 */

const VIEWS: TabOption[] = [
  { value: "proveedor", label: "Por proveedor" },
  { value: "compra", label: "Por compra" },
  { value: "producto", label: "Por producto" },
  { value: "pedido", label: "Por pedido" },
  { value: "canal", label: "Por canal" },
  { value: "sin-costo", label: "Sin costo completo" },
  { value: "variaciones", label: "Variaciones" },
  { value: "historial", label: "Historial" },
];

export function CostsBoard() {
  const pos = useLocalCollection<PurchaseOrder>("po:list");
  const [view, setView] = useState("proveedor");

  // Per-supplier cost totals, split by currency (never mixed).
  const bySupplier = useMemo(() => {
    const map = new Map<
      string,
      { supplier: string; currency: string; total: number; landedState: string }
    >();
    for (const po of pos.items) {
      const key = `${po.supplier}|${po.currency}`;
      const landed = computeLandedCost({
        currency: po.currency,
        purchase: orderSubtotal(po.lines).subtotal,
        other: po.additionalCosts,
      });
      const e = map.get(key) ?? {
        supplier: po.supplier,
        currency: po.currency,
        total: 0,
        landedState: landed.state,
      };
      e.total += orderTotal(po);
      map.set(key, e);
    }
    return [...map.values()];
  }, [pos.items]);

  // Per-SKU costs across POs for variation.
  const skuCosts = useMemo(() => {
    const map = new Map<string, { at: string; value: number; currency: string }[]>();
    for (const po of pos.items) {
      for (const l of po.lines) {
        if (l.unitPrice == null || !l.sku) continue;
        const arr = map.get(l.sku) ?? [];
        arr.push({ at: po.createdAt, value: l.unitPrice, currency: po.currency });
        map.set(l.sku, arr);
      }
    }
    return map;
  }, [pos.items]);

  const noSource = pos.items.length === 0;

  return (
    <div>
      <SegmentedControl
        options={VIEWS}
        value={view}
        onChange={setView}
        className="mb-4 flex-wrap"
      />

      {noSource && (view === "proveedor" || view === "compra" || view === "variaciones") ? (
        <HonestState
          icon="dollar"
          title="Sin fuente de costos."
          description="Los costos se derivan de órdenes de compra reales. Crea OC en Compras → Órdenes de compra."
        />
      ) : null}

      {view === "proveedor" && !noSource ? (
        <Table
          head={["Proveedor", "Moneda", "Costo total", "Landed"]}
          rows={bySupplier.map((s) => [
            s.supplier,
            s.currency,
            <MoneyValue key="t" amount={s.total} currency={s.currency} />,
            <Badge key="l" kind="warning">
              {CALC_STATE_LABEL[s.landedState as keyof typeof CALC_STATE_LABEL] ?? s.landedState}
            </Badge>,
          ])}
          caption="Costo real de OC · landed estimado (nunca confirmado) · monedas no mezcladas"
        />
      ) : null}

      {view === "compra" && !noSource ? (
        <Table
          head={["OC", "Proveedor", "Total", "Landed (estimado)", "Estado"]}
          rows={pos.items.map((po) => {
            const landed = computeLandedCost({
              currency: po.currency,
              purchase: orderSubtotal(po.lines).subtotal,
              other: po.additionalCosts,
            });
            return [
              po.number,
              po.supplier,
              <MoneyValue key="t" amount={orderTotal(po)} currency={po.currency} />,
              landed.value == null ? (
                <span key="v" className="text-faint">
                  No medido
                </span>
              ) : (
                <MoneyValue key="v" amount={landed.value} currency={po.currency} />
              ),
              <Badge key="s" kind="warning">
                {CALC_STATE_LABEL[landed.state]}
              </Badge>,
            ];
          })}
          caption={`${pos.items.length} órdenes · landed = compra + otros − descuento`}
        />
      ) : null}

      {view === "variaciones" && !noSource
        ? (() => {
            const rows = [...skuCosts.entries()]
              .map(([sku, costs]) => ({ sku, v: costVariation(costs) }))
              .filter((x) => x.v);
            if (rows.length === 0)
              return (
                <HonestState
                  icon="dollar"
                  title="Sin variaciones."
                  description="Se necesitan al menos dos costos del mismo SKU y moneda."
                />
              );
            return (
              <Table
                head={["SKU", "Anterior", "Último", "Delta"]}
                rows={rows.map(({ sku, v }) => [
                  sku,
                  <MoneyValue key="p" amount={v!.previous} currency={v!.currency} />,
                  <MoneyValue key="l" amount={v!.last} currency={v!.currency} />,
                  <span key="d" className={v!.delta > 0 ? "text-warn" : "text-ok"}>
                    {v!.delta > 0 ? "+" : ""}
                    {v!.delta}
                  </span>,
                ])}
                caption="Comparación del mismo SKU y moneda"
              />
            );
          })()
        : null}

      {view === "sin-costo" ? <SinCosto pos={pos.items} /> : null}

      {view === "producto" || view === "pedido" || view === "canal" ? (
        <HonestState
          icon="alert"
          title={`Margen por ${view}: fuente incompleta.`}
          description={
            <>
              El margen requiere enlazar precio de venta (Shopify) y costo (OC) por SKU; hoy no hay
              catálogo interno que los una, así que se muestra{" "}
              <span className="font-medium text-foreground">Fuente incompleta</span> — nunca margen
              cero. Ejemplo de la fórmula: {marginExample()}.
            </>
          }
        />
      ) : null}

      {view === "historial" ? (
        <HonestState
          icon="dollar"
          title="Sin historial de costos."
          description="Registrará cambios reales de costo con fuente y fecha; no se inventan."
        />
      ) : null}
    </div>
  );
}

function marginExample(): string {
  const landed = computeLandedCost({ currency: "USD", purchase: 10, freight: 2 });
  const m = computeMargin(20, "USD", landed);
  return `precio 20 − landed ${landed.value} (${CALC_STATE_LABEL[landed.state]}) = margen ${m.value} (${CALC_STATE_LABEL[m.state]})`;
}

function SinCosto({ pos }: { pos: PurchaseOrder[] }) {
  const incomplete = pos.flatMap((po) =>
    po.lines.filter((l) => l.unitPrice == null).map((l) => ({ po: po.number, sku: l.sku || "—" })),
  );
  if (incomplete.length === 0)
    return (
      <HonestState
        icon="dollar"
        title="Sin líneas sin costo."
        description="Todas las líneas de OC tienen precio, o no hay OC."
      />
    );
  return (
    <Table
      head={["OC", "SKU"]}
      rows={incomplete.map((x) => [x.po, x.sku])}
      caption={`${incomplete.length} líneas sin costo`}
    />
  );
}

function Table({
  head,
  rows,
  caption,
}: {
  head: string[];
  rows: React.ReactNode[][];
  caption?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-muted/40 text-left text-[0.64rem] uppercase tracking-wider text-faint">
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0">
              {r.map((cell, j) => (
                <td key={j} className="px-3 py-2 tabular-nums">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {caption ? (
        <div className="border-t border-border/70 px-3 py-2 text-[0.68rem] text-faint">
          {caption}
        </div>
      ) : null}
    </div>
  );
}
