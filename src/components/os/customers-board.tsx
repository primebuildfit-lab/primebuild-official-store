"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Badge,
  DataTable,
  DetailDrawer,
  HonestState,
  SegmentedControl,
  type Column,
  type TabOption,
} from "@/components/ds";
import { useVersionedCollection, useLocalCollection, localId } from "@/lib/local-collection";
import { ORDERS_SCHEMA_VERSION, isSalesOrder, type SalesOrderProjection } from "@/lib/orders";
import { RETURNS_SCHEMA_VERSION, isReturn, type SalesReturn } from "@/lib/returns";
import {
  aggregateLocalCustomers,
  canMassExport,
  type CustomerNote,
  type CustomerProjection,
} from "@/lib/customers";

/**
 * Clientes (PBOS-001 · ORDEN 22). A minimal projection to operate orders/returns/
 * fulfillment/support — not a CRM. Contact is masked, addresses are withheld
 * unless needed, internal notes are kept separate, and mass export is blocked
 * without a capability. Segmentation is never invented.
 */

const TABS: TabOption[] = [
  { value: "resumen", label: "Resumen" },
  { value: "pedidos", label: "Pedidos" },
  { value: "devoluciones", label: "Devoluciones" },
  { value: "direcciones", label: "Direcciones" },
  { value: "notas", label: "Notas internas" },
  { value: "consentimientos", label: "Consentimientos" },
  { value: "shopify", label: "Shopify" },
  { value: "actividad", label: "Actividad" },
];

export function CustomersBoard() {
  const orders = useVersionedCollection<SalesOrderProjection>(
    "orders:projections",
    ORDERS_SCHEMA_VERSION,
    isSalesOrder,
  );
  const returns = useVersionedCollection<SalesReturn>(
    "returns:list",
    RETURNS_SCHEMA_VERSION,
    isReturn,
  );
  const notes = useLocalCollection<CustomerNote>("customers:notes");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const customers = useMemo(
    () => aggregateLocalCustomers(orders.items, returns.items),
    [orders.items, returns.items],
  );
  const selected = customers.find((c) => c.key === selectedKey) ?? null;

  const columns: Column<CustomerProjection>[] = [
    {
      key: "name",
      header: "Cliente",
      render: (r) => <span className="font-medium">{r.displayName}</span>,
    },
    {
      key: "contact",
      header: "Contacto",
      render: (r) => <span className="text-muted">{r.contactMasked ?? "—"}</span>,
    },
    { key: "orders", header: "Pedidos", align: "right", render: (r) => String(r.orders) },
    { key: "returns", header: "Devoluciones", align: "right", render: (r) => String(r.returns) },
    { key: "source", header: "Fuente", render: (r) => <Badge kind="neutral">{r.source}</Badge> },
    {
      key: "open",
      header: "",
      align: "right",
      render: (r) => (
        <button
          type="button"
          onClick={() => setSelectedKey(r.key)}
          className="text-xs text-muted hover:text-foreground"
        >
          Abrir
        </button>
      ),
    },
  ];

  if (customers.length === 0) {
    return (
      <HonestState
        icon="users"
        title="Sin clientes."
        description={
          <>
            Los clientes se proyectan desde pedidos reales importados; no se inventan.{" "}
            <Link href="/store/orders" className="text-accent hover:underline">
              Ir a Pedidos
            </Link>
            .
          </>
        }
      />
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-border bg-surface/50 px-3 py-2 text-xs text-muted">
        <span>Proyección mínima · contactos enmascarados · sin CRM general</span>
        <button
          type="button"
          disabled
          title={canMassExport(false).reason}
          className="cursor-not-allowed rounded-lg border border-border px-2.5 py-1 text-faint opacity-60"
        >
          Exportar (masivo)
        </button>
      </div>

      <DataTable columns={columns} rows={customers} getKey={(r) => r.key} />

      {selected ? (
        <CustomerDrawer
          key={selected.key}
          customer={selected}
          notes={notes.items.filter((n) => n.customerKey === selected.key)}
          onClose={() => setSelectedKey(null)}
          onAddNote={(text) =>
            notes.add({
              id: localId(),
              customerKey: selected.key,
              at: new Date().toISOString(),
              text,
            })
          }
        />
      ) : null}
    </div>
  );
}

function CustomerDrawer({
  customer,
  notes,
  onClose,
  onAddNote,
}: {
  customer: CustomerProjection;
  notes: CustomerNote[];
  onClose: () => void;
  onAddNote: (text: string) => void;
}) {
  const [tab, setTab] = useState("resumen");
  const [note, setNote] = useState("");

  return (
    <DetailDrawer
      open
      onClose={onClose}
      title={customer.displayName}
      description="Proyección mínima de cliente"
    >
      <SegmentedControl options={TABS} value={tab} onChange={setTab} className="mb-4 flex-wrap" />

      {tab === "resumen" ? (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <F label="Identificación" value={customer.displayName} />
          <F label="Contacto" value={customer.contactMasked ?? "—"} />
          <F label="Pedidos" value={String(customer.orders)} />
          <F label="Devoluciones" value={String(customer.returns)} />
          <F label="Fuente" value={customer.source} />
          <F
            label="Última actividad"
            value={
              customer.lastActivity ? new Date(customer.lastActivity).toLocaleString("es") : "—"
            }
          />
        </div>
      ) : null}

      {tab === "pedidos" ? (
        <Note
          text={`${customer.orders} pedidos. Detalle por pedido en la bandeja de Pedidos.`}
          link="/store/orders"
        />
      ) : null}
      {tab === "devoluciones" ? (
        <Note
          text={`${customer.returns} devoluciones. Detalle en Devoluciones.`}
          link="/sales/returns"
        />
      ) : null}
      {tab === "direcciones" ? (
        <Note text="Dirección oculta: solo se muestra para una operación autorizada que la requiera. No se expone por defecto." />
      ) : null}
      {tab === "consentimientos" ? (
        <Note text="Consentimientos/preferencias observados: sin fuente conectada. No se inventan ni se escriben en Shopify sin contrato." />
      ) : null}
      {tab === "shopify" ? (
        <Note
          text={
            customer.shopifyId ? `Shopify ID: ${customer.shopifyId}` : "Sin Shopify ID observado."
          }
        />
      ) : null}
      {tab === "actividad" ? (
        <Note text="Actividad registrada del cliente aparecerá aquí con fecha y origen." />
      ) : null}

      {tab === "notas" ? (
        <div>
          <div className="mb-2 flex gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nota interna"
              className="flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (note.trim()) {
                  onAddNote(note.trim());
                  setNote("");
                }
              }}
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground"
            >
              Añadir
            </button>
          </div>
          {notes.length === 0 ? (
            <p className="text-xs text-faint">
              Sin notas. Separadas de los datos del cliente y nunca en logs.
            </p>
          ) : (
            <ul className="flex flex-col gap-1 text-xs text-muted">
              {notes.map((n) => (
                <li key={n.id}>
                  {new Date(n.at).toLocaleString("es")} · {n.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </DetailDrawer>
  );
}

function F({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-2.5 py-1.5">
      <p className="text-[0.62rem] uppercase tracking-wide text-faint">{label}</p>
      <p className="mt-0.5">{value}</p>
    </div>
  );
}

function Note({ text, link }: { text: string; link?: string }) {
  return (
    <p className="text-sm text-muted">
      {text}{" "}
      {link ? (
        <Link href={link} className="text-accent hover:underline">
          Abrir →
        </Link>
      ) : null}
    </p>
  );
}
