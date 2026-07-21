"use client";

import { useMemo, useState } from "react";
import { Badge, DetailDrawer, MetricCard, SegmentedControl, type TabOption } from "@/components/ds";
import { useVersionedCollection, useLocalCollection, useLedger } from "@/lib/local-collection";
import { INVENTORY_SCHEMA_VERSION, isMovement, type InventoryMovement } from "@/lib/inventory";
import {
  WAREHOUSE_SCHEMA_VERSION,
  isWarehouse,
  isLocation,
  type Warehouse,
  type Location,
} from "@/lib/warehouses";
import type { PurchaseOrder } from "@/lib/purchase-orders";
import type { Receipt } from "@/lib/receiving";
import type { Supplier } from "@/lib/suppliers";
import { ORDERS_SCHEMA_VERSION, isSalesOrder, type SalesOrderProjection } from "@/lib/orders";
import { FULFILLMENT_SCHEMA_VERSION, isFulfillment, type Fulfillment } from "@/lib/fulfillment";
import { RETURNS_SCHEMA_VERSION, isReturn, type SalesReturn } from "@/lib/returns";
import {
  ANALYTICS_STATUS,
  computeInventoryTotals,
  measured,
  unmeasured,
  type MetricValue,
} from "@/lib/metrics";

/**
 * Métricas (PBOS-001 · ORDEN 24). Operational/commercial metrics with a contract.
 * Computed only from real local sources; sales/rotation/coverage/margins/trends
 * are never invented ("No medido"). Warehouses/currencies are never mixed. The
 * warehouse filter actually re-scopes the inventory metrics. Analytics is pending.
 */

const AREAS: TabOption[] = [
  { value: "inventario", label: "Inventario" },
  { value: "compras", label: "Compras" },
  { value: "proveedores", label: "Proveedores" },
  { value: "recepciones", label: "Recepciones" },
  { value: "almacenes", label: "Almacenes" },
  { value: "pedidos", label: "Pedidos" },
  { value: "fulfillment", label: "Fulfillment" },
  { value: "devoluciones", label: "Devoluciones" },
  { value: "shopify", label: "Shopify" },
  { value: "calidad", label: "Calidad de datos" },
];

export function MetricsBoard() {
  const ledger = useLedger<InventoryMovement>(
    "inventory:movements",
    INVENTORY_SCHEMA_VERSION,
    isMovement,
  );
  const pos = useLocalCollection<PurchaseOrder>("po:list");
  const suppliers = useLocalCollection<Supplier>("suppliers:list");
  const receipts = useLocalCollection<Receipt>("receiving:list");
  const warehouses = useVersionedCollection<Warehouse>(
    "inventory:warehouses",
    WAREHOUSE_SCHEMA_VERSION,
    isWarehouse,
  );
  const locations = useVersionedCollection<Location>(
    "inventory:locations",
    WAREHOUSE_SCHEMA_VERSION,
    isLocation,
  );
  const orders = useVersionedCollection<SalesOrderProjection>(
    "orders:projections",
    ORDERS_SCHEMA_VERSION,
    isSalesOrder,
  );
  const fulfillments = useVersionedCollection<Fulfillment>(
    "fulfillment:list",
    FULFILLMENT_SCHEMA_VERSION,
    isFulfillment,
  );
  const returns = useVersionedCollection<SalesReturn>(
    "returns:list",
    RETURNS_SCHEMA_VERSION,
    isReturn,
  );

  const [area, setArea] = useState("inventario");
  const [wh, setWh] = useState("");
  const [selected, setSelected] = useState<MetricValue | null>(null);

  const metrics = useMemo((): MetricValue[] => {
    switch (area) {
      case "inventario": {
        const t = computeInventoryTotals(ledger.entries, wh || undefined);
        return [
          measured(
            "Físico",
            "Unidades físicas presentes",
            "Σ movimientos publicados",
            "uds",
            "ledger local",
            String(t.physical),
          ),
          measured(
            "Disponible (ok)",
            "Unidades en condición ok",
            "Σ ok",
            "uds",
            "ledger local",
            String(t.onHand),
          ),
          measured(
            "Dañado",
            "Unidades dañadas",
            "Σ dañado",
            "uds",
            "ledger local",
            String(t.damaged),
          ),
          measured(
            "Cuarentena",
            "Unidades en cuarentena",
            "Σ cuarentena",
            "uds",
            "ledger local",
            String(t.quarantine),
          ),
          measured(
            "Líneas de stock",
            "SKU×almacén con saldo",
            "count",
            "líneas",
            "ledger local",
            String(t.lines),
          ),
          unmeasured(
            "Rotación",
            "Rotación de inventario",
            "Requiere ventas/consumo observado, no disponible",
          ),
          unmeasured(
            "Días de cobertura",
            "Cobertura por demanda",
            "Requiere demanda observada, no disponible",
          ),
        ];
      }
      case "compras": {
        const open = pos.items.filter((p) => !["cerrada", "cancelada"].includes(p.status)).length;
        return [
          measured(
            "Órdenes de compra",
            "OC registradas",
            "count",
            "OC",
            "OC local",
            String(pos.items.length),
          ),
          measured(
            "OC abiertas",
            "OC no cerradas/canceladas",
            "count",
            "OC",
            "OC local",
            String(open),
          ),
          unmeasured(
            "Valor de compra",
            "Gasto de compra",
            "Monedas no mezcladas: ver Costos y márgenes",
          ),
        ];
      }
      case "proveedores":
        return [
          measured(
            "Proveedores",
            "Proveedores registrados",
            "count",
            "prov.",
            "proveedores local",
            String(suppliers.items.length),
          ),
          measured(
            "Verificados",
            "Proveedores verificados",
            "count",
            "prov.",
            "proveedores local",
            String(suppliers.items.filter((s) => s.verified).length),
          ),
        ];
      case "recepciones":
        return [
          measured(
            "Recepciones",
            "Recepciones registradas",
            "count",
            "rec.",
            "recepciones local",
            String(receipts.items.length),
          ),
          measured(
            "Con discrepancias",
            "Recepciones discrepantes",
            "count",
            "rec.",
            "recepciones local",
            String(receipts.items.filter((r) => r.status === "con-discrepancias").length),
          ),
        ];
      case "almacenes":
        return [
          measured(
            "Almacenes",
            "Almacenes definidos",
            "count",
            "alm.",
            "almacenes local",
            String(warehouses.items.length),
          ),
          measured(
            "Ubicaciones",
            "Ubicaciones definidas",
            "count",
            "ubic.",
            "ubicaciones local",
            String(locations.items.length),
          ),
        ];
      case "pedidos":
        return [
          measured(
            "Pedidos importados",
            "Proyecciones de pedido",
            "count",
            "ped.",
            "pedidos local",
            String(orders.items.length),
          ),
          measured(
            "Sin reservar",
            "Pedidos sin reserva",
            "count",
            "ped.",
            "pedidos local",
            String(orders.items.filter((o) => o.reservationStatus === "sin-reservar").length),
          ),
          unmeasured("Ventas netas", "Ventas del periodo", "Requiere fuente de ventas verificada"),
        ];
      case "fulfillment":
        return [
          measured(
            "Preparaciones",
            "Fulfillments locales",
            "count",
            "fulf.",
            "fulfillment local",
            String(fulfillments.items.length),
          ),
          measured(
            "Con incidencia",
            "Fulfillments con incidencia",
            "count",
            "fulf.",
            "fulfillment local",
            String(fulfillments.items.filter((f) => f.status === "con-incidencia").length),
          ),
        ];
      case "devoluciones":
        return [
          measured(
            "Devoluciones",
            "Devoluciones registradas",
            "count",
            "dev.",
            "devoluciones local",
            String(returns.items.length),
          ),
          measured(
            "Pendientes de reembolso",
            "En pendiente-reembolso",
            "count",
            "dev.",
            "devoluciones local",
            String(returns.items.filter((r) => r.status === "pendiente-reembolso").length),
          ),
        ];
      case "shopify":
        return [
          unmeasured("Métricas Shopify", "Métricas de la tienda pública", "Shopify no conectado"),
        ];
      case "calidad": {
        const noPrice = pos.items.flatMap((p) => p.lines).filter((l) => l.unitPrice == null).length;
        const noSku = ledger.entries.filter((m) => !m.sku).length;
        return [
          measured(
            "OC líneas sin precio",
            "Líneas de OC sin costo",
            "count",
            "líneas",
            "OC local",
            String(noPrice),
          ),
          measured(
            "Movimientos sin SKU",
            "Movimientos sin SKU",
            "count",
            "mov.",
            "ledger local",
            String(noSku),
          ),
        ];
      }
      default:
        return [];
    }
  }, [
    area,
    wh,
    ledger.entries,
    pos.items,
    suppliers.items,
    receipts.items,
    warehouses.items,
    locations.items,
    orders.items,
    fulfillments.items,
    returns.items,
  ]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl options={AREAS} value={area} onChange={setArea} className="flex-wrap" />
        {area === "inventario" ? (
          <label className="text-xs text-muted">
            Almacén{" "}
            <select
              value={wh}
              onChange={(e) => setWh(e.target.value)}
              className="rounded-lg border border-border bg-surface px-2 py-1 text-sm outline-none"
            >
              <option value="">Todos</option>
              {warehouses.items.map((w) => (
                <option key={w.id} value={w.code}>
                  {w.code}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((m) => (
          <button
            key={m.contract.name}
            type="button"
            onClick={() => setSelected(m)}
            className="text-left"
          >
            <MetricCard
              label={m.contract.name}
              value={m.value}
              unit={m.value != null ? m.contract.unit : undefined}
              source={m.value != null ? `Fuente: ${m.contract.source}` : m.contract.limitations}
              notMeasured="No medido"
            />
          </button>
        ))}
      </div>

      {area === "shopify" || area === "pedidos" ? (
        <p className="mt-4 text-xs text-faint">
          {ANALYTICS_STATUS} — el propietario de Analytics aún no está decidido.
        </p>
      ) : null}

      {selected ? (
        <DetailDrawer
          open
          onClose={() => setSelected(null)}
          title={selected.contract.name}
          description="Contrato de métrica"
        >
          <dl className="grid grid-cols-1 gap-2 text-sm">
            <CRow k="Definición" v={selected.contract.definition} />
            <CRow k="Fórmula" v={selected.contract.formula} />
            <CRow k="Unidad" v={selected.contract.unit} />
            <CRow k="Fuente" v={selected.contract.source} />
            <CRow
              k="Estado"
              v={
                <Badge kind={selected.contract.state === "medido" ? "healthy" : "warning"}>
                  {selected.contract.state}
                </Badge>
              }
            />
            <CRow k="Valor" v={selected.value ?? "No medido"} />
            {selected.contract.limitations ? (
              <CRow k="Limitaciones" v={selected.contract.limitations} />
            ) : null}
          </dl>
          <p className="mt-3 text-[0.68rem] text-faint">
            Drill-down: los valores medidos derivan de las colecciones locales listadas como fuente;
            los no medidos explican por qué no existen.
          </p>
        </DetailDrawer>
      ) : null}
    </div>
  );
}

function CRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/50 py-1.5 last:border-0">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}
