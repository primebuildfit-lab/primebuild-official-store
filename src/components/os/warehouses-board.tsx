"use client";

import { useState } from "react";
import { Badge, DataTable, DetailDrawer, Icon, type Column } from "@/components/ds";
import { useVersionedCollection, useLedger, localId } from "@/lib/local-collection";
import { INVENTORY_SCHEMA_VERSION, isMovement, type InventoryMovement } from "@/lib/inventory";
import {
  LOCATION_TYPES,
  WAREHOUSE_SCHEMA_VERSION,
  isLocation,
  isNonSellable,
  isWarehouse,
  validateLocation,
  validateWarehouse,
  type Location,
  type LocationType,
  type Warehouse,
} from "@/lib/warehouses";

/**
 * Almacenes y ubicaciones (PBOS-001 · ORDEN 12). Operator-defined warehouses and
 * a flexible location hierarchy (Almacén→…→Bin or just Almacén→Ubicación). No
 * fictional warehouse is seeded. Codes are unique within scope, the hierarchy
 * cannot cycle, quarantine/damaged locations are not sellable, and a warehouse or
 * location with real movements cannot be deleted. Shopify mapping only appears
 * with evidence; without it, it is disabled and honest.
 */
export function WarehousesBoard() {
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
  const ledger = useLedger<InventoryMovement>(
    "inventory:movements",
    INVENTORY_SCHEMA_VERSION,
    isMovement,
  );

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = warehouses.items.find((w) => w.id === selectedId) ?? null;

  function movementsForWarehouse(w: Warehouse): number {
    const keys = new Set([w.code.toLowerCase(), w.name.toLowerCase(), w.id]);
    return ledger.entries.filter((m) => keys.has((m.warehouseId ?? "").toLowerCase())).length;
  }

  function addWarehouse() {
    const parsed = validateWarehouse(warehouses.items, { name, code });
    if (!parsed.ok) return setError(parsed.error ?? "No válido.");
    warehouses.add({
      id: localId(),
      name: name.trim(),
      code: code.trim(),
      status: "activo",
      shopifyLocationId: null,
      createdAt: new Date().toISOString(),
    });
    setName("");
    setCode("");
    setError(null);
  }

  function deleteWarehouse(w: Warehouse) {
    if (movementsForWarehouse(w) > 0) return;
    // Also remove its locations (none can have movements at this point).
    locations.items.filter((l) => l.warehouseId === w.id).forEach((l) => locations.remove(l.id));
    warehouses.remove(w.id);
    setSelectedId(null);
  }

  const columns: Column<Warehouse>[] = [
    {
      key: "name",
      header: "Almacén",
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: "code",
      header: "Código",
      render: (r) => <span className="font-mono text-xs">{r.code}</span>,
    },
    { key: "status", header: "Estado", render: (r) => <Badge kind="neutral">{r.status}</Badge> },
    {
      key: "locs",
      header: "Ubicaciones",
      align: "right",
      render: (r) => String(locations.items.filter((l) => l.warehouseId === r.id).length),
    },
    {
      key: "shopify",
      header: "Shopify",
      render: (r) =>
        r.shopifyLocationId ? (
          <Badge kind="info">Mapeada</Badge>
        ) : (
          <span className="text-faint">No conectado</span>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <button
          type="button"
          onClick={() => setSelectedId(r.id)}
          className="text-xs text-muted hover:text-foreground"
        >
          Abrir
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
            placeholder="Almacén real"
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Código
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="WH-01"
            className="w-28 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <button
          type="button"
          onClick={addWarehouse}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Crear almacén
        </button>
        <span className="ml-auto text-[0.68rem] text-faint">
          Guardado local · sin almacén ficticio precargado
        </span>
      </div>
      {error ? <p className="mb-3 text-xs text-warn">{error}</p> : null}

      <DataTable
        columns={columns}
        rows={warehouses.items}
        getKey={(r) => r.id}
        emptyMessage="Aún no hay almacenes. Crea almacenes reales arriba."
      />

      {selected ? (
        <WarehouseDrawer
          key={selected.id}
          warehouse={selected}
          locations={locations.items.filter((l) => l.warehouseId === selected.id)}
          movements={ledger.entries}
          canDelete={movementsForWarehouse(selected) === 0}
          onClose={() => setSelectedId(null)}
          onDelete={() => deleteWarehouse(selected)}
          onAddLocation={(loc) => locations.add(loc)}
          onRemoveLocation={(id) => locations.remove(id)}
        />
      ) : null}
    </div>
  );
}

function WarehouseDrawer({
  warehouse,
  locations,
  movements,
  canDelete,
  onClose,
  onDelete,
  onAddLocation,
  onRemoveLocation,
}: {
  warehouse: Warehouse;
  locations: Location[];
  movements: InventoryMovement[];
  canDelete: boolean;
  onClose: () => void;
  onDelete: () => void;
  onAddLocation: (loc: Location) => void;
  onRemoveLocation: (id: string) => void;
}) {
  const [code, setCode] = useState("");
  const [type, setType] = useState<LocationType>("almacenamiento");
  const [parentId, setParentId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function locationHasActivity(loc: Location): boolean {
    return movements.some((m) => m.locationId === loc.id);
  }
  function locationHasChildren(loc: Location): boolean {
    return locations.some((l) => l.parentId === loc.id);
  }

  function addLocation() {
    const parsed = validateLocation(locations, { code, parentId: parentId || null });
    if (!parsed.ok) return setError(parsed.error ?? "No válido.");
    onAddLocation({
      id: localId(),
      warehouseId: warehouse.id,
      code: code.trim(),
      type,
      parentId: parentId || null,
      virtual: type === "virtual",
    });
    setCode("");
    setParentId("");
    setError(null);
  }

  return (
    <DetailDrawer
      open
      onClose={onClose}
      title={`${warehouse.name} · ${warehouse.code}`}
      description="Almacén y ubicaciones"
      footer={
        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete}
          title={
            canDelete
              ? "Eliminar almacén sin movimientos"
              : "No se puede eliminar un almacén con movimientos"
          }
          className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Eliminar almacén
        </button>
      }
    >
      <div className="flex flex-col gap-5">
        <section>
          <p className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-faint">
            Shopify
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface/60 px-3 py-2 text-xs">
            <Badge kind="warning">No conectado</Badge>
            <span className="text-muted">
              El mapping con una Shopify location requiere evidencia real.
            </span>
            <button
              type="button"
              disabled
              className="ml-auto cursor-not-allowed rounded border border-border px-2 py-1 text-faint opacity-60"
            >
              Mapear
            </button>
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-faint">
              Ubicaciones ({locations.length})
            </p>
          </div>
          <div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-surface/50 p-2.5">
            <label className="flex flex-col gap-1 text-[0.68rem] text-muted">
              Código
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="A-01-01"
                className="w-24 rounded border border-border bg-surface px-1.5 py-1 text-xs outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-[0.68rem] text-muted">
              Tipo
              <select
                value={type}
                onChange={(e) => setType(e.target.value as LocationType)}
                className="rounded border border-border bg-surface px-1.5 py-1 text-xs outline-none"
              >
                {LOCATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[0.68rem] text-muted">
              Padre
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="rounded border border-border bg-surface px-1.5 py-1 text-xs outline-none"
              >
                <option value="">— Ninguno —</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.code}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={addLocation}
              className="rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90"
            >
              Añadir
            </button>
          </div>
          {error ? <p className="mb-2 text-xs text-warn">{error}</p> : null}
          {locations.length === 0 ? (
            <p className="text-xs text-faint">
              Sin ubicaciones. Puedes usar una estructura simple (Almacén → Ubicación) o crecer a
              Zona → Pasillo → Rack → Nivel → Bin.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {locations.map((l) => {
                const blocked = locationHasActivity(l) || locationHasChildren(l);
                return (
                  <li
                    key={l.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs"
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-mono">{l.code}</span>
                      <Badge kind={isNonSellable(l.type) ? "warning" : "neutral"}>{l.type}</Badge>
                      {l.virtual ? (
                        <span className="text-[0.6rem] uppercase text-faint">
                          virtual · no físico
                        </span>
                      ) : null}
                      {isNonSellable(l.type) ? (
                        <span className="text-[0.6rem] uppercase text-warn">no vendible</span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveLocation(l.id)}
                      disabled={blocked}
                      title={
                        blocked
                          ? "No se puede eliminar: tiene actividad o sub-ubicaciones"
                          : "Eliminar ubicación"
                      }
                      className="text-faint hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Icon name="x" size={13} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-2 text-[0.66rem] text-faint">
            Mover cantidades se hace por transferencia o ajuste, no cambiando la ubicación
            directamente. Cuarentena y dañados no son vendibles.
          </p>
        </section>
      </div>
    </DetailDrawer>
  );
}
