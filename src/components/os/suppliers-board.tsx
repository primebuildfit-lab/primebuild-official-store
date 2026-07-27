"use client";

import { useState } from "react";
import {
  Badge,
  DataTable,
  DetailDrawer,
  HonestState,
  SourceBadge,
  type Column,
} from "@/components/ds";
import { useLocalCollection, localId } from "@/lib/local-collection";
import { validateSupplier, sourceLabel, type Supplier } from "@/lib/suppliers";

/**
 * Proveedores (PBOS-001 · ORDEN 8). The operational supplier registry. Suppliers
 * are only what the operator really registers — none are pre-created from
 * historical mentions. Each carries how its data arrived (source) and whether it
 * is verified (default: not verified, no evidence). Manual/local entries persist
 * locally; supplier-product catalogs need a connected source and stay honestly
 * empty.
 */
export function SuppliersBoard() {
  const suppliers = useLocalCollection<Supplier>("suppliers:list");
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("");
  const [lead, setLead] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Supplier | null>(null);

  function add() {
    const parsed = validateSupplier(suppliers.items, { name, currency });
    if (!parsed.ok) return setError(parsed.error ?? "No válido.");
    suppliers.add({
      id: localId(),
      name: name.trim(),
      status: "en-revision",
      source: "manual",
      verified: false,
      currency: currency.trim().toUpperCase() || null,
      leadTimeDays: lead.trim() ? Number(lead) : null,
      createdAt: new Date().toISOString(),
    });
    setName("");
    setCurrency("");
    setLead("");
    setError(null);
  }

  const columns: Column<Supplier>[] = [
    {
      key: "name",
      header: "Proveedor",
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    { key: "status", header: "Estado", render: (r) => <Badge kind="neutral">{r.status}</Badge> },
    {
      key: "source",
      header: "Origen",
      render: (r) => <Badge kind="neutral">{sourceLabel(r.source)}</Badge>,
    },
    {
      key: "verified",
      header: "Verificación",
      render: (r) => (
        <SourceBadge source={r.name} verification={r.verified ? "verified" : "unverified"} />
      ),
    },
    {
      key: "currency",
      header: "Moneda",
      render: (r) => r.currency ?? <span className="text-faint">—</span>,
    },
    {
      key: "lead",
      header: "Lead time",
      align: "right",
      render: (r) =>
        r.leadTimeDays == null ? (
          <span className="text-faint">No medido</span>
        ) : (
          `${r.leadTimeDays} d`
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <button
          type="button"
          onClick={() => setSelected(r)}
          className="text-xs text-muted hover:text-foreground"
        >
          Ver
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
            placeholder="Nombre del proveedor real"
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
            className="w-20 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Lead time (días)
          <input
            value={lead}
            onChange={(e) => setLead(e.target.value)}
            type="number"
            placeholder="—"
            className="w-24 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <button
          type="button"
          onClick={add}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Registrar proveedor
        </button>
        <span className="ml-auto text-[0.68rem] text-faint">
          Guardado local · no verificado hasta que exista evidencia
        </span>
      </div>
      {error ? <p className="mb-3 text-xs text-warn">{error}</p> : null}

      <DataTable
        columns={columns}
        rows={suppliers.items}
        getKey={(r) => r.id}
        emptyMessage="Aún no hay proveedores. Registra proveedores reales arriba; no se precrean por menciones."
        caption={
          <>
            <span>Registro local · una mención no es una integración</span>
            <span className="tabular-nums">{suppliers.items.length} proveedores</span>
          </>
        }
      />

      <DetailDrawer
        open={selected != null}
        onClose={() => setSelected(null)}
        title={selected?.name}
        description="Detalle del proveedor"
      >
        {selected ? (
          <div className="flex flex-col gap-5">
            <section className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Estado" value={selected.status} />
              <Field label="Origen" value={sourceLabel(selected.source)} />
              <Field
                label="Verificación"
                value={selected.verified ? "verificado" : "sin verificar"}
              />
              <Field label="Moneda" value={selected.currency ?? "—"} />
              <Field
                label="Lead time"
                value={
                  selected.leadTimeDays == null ? "No medido" : `${selected.leadTimeDays} días`
                }
              />
              <Field label="Responsable" value={selected.responsible ?? "—"} />
            </section>

            <section>
              <p className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-faint">
                Productos del proveedor
              </p>
              <HonestState
                icon="box"
                title="Sin catálogo de proveedor."
                description="Los supplier SKUs, unidades de compra, cantidades por caja, MOQ, múltiplos y precios requieren un catálogo de proveedor conectado o importado. Aún no hay ninguno; no se inventan."
              />
            </section>

            <p className="text-xs text-faint">
              Editar aquí modifica solo metadatos internos. Los datos recibidos del proveedor no se
              editan sin un contrato explícito.
            </p>
          </div>
        ) : null}
      </DetailDrawer>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[0.68rem] uppercase tracking-[0.12em] text-faint">{label}</p>
      <p className="mt-0.5">{value}</p>
    </div>
  );
}
