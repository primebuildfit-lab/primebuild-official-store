"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Badge,
  DataTable,
  DetailDrawer,
  HonestState,
  SegmentedControl,
  StatusBadge,
  type Column,
  type TabOption,
} from "@/components/ds";
import {
  useVersionedCollection,
  useLocalCollection,
  useLedger,
  localId,
} from "@/lib/local-collection";
import {
  INVENTORY_SCHEMA_VERSION,
  deriveBalances,
  isMovement,
  stockKey,
  type InventoryMovement,
} from "@/lib/inventory";
import type { Receipt } from "@/lib/receiving";
import type { Supplier } from "@/lib/suppliers";
import { RETURNS_SCHEMA_VERSION, isReturn, type SalesReturn } from "@/lib/returns";
import {
  QUALITY_SCHEMA_VERSION,
  QUALITY_TRANSITIONS,
  buildQuarantineRelease,
  deriveQualitySignals,
  isQualityIncident,
  qualityStatusLabel,
  type QualityIncident,
  type QualityStatus,
} from "@/lib/quality";

/**
 * Calidad y trazabilidad (PBOS-QUALITY-CORRECTIVE-001). Observes real signals
 * (damage/quarantine/discrepancies/lots) and relates them; incidents never modify
 * inventory by themselves — quantity changes go through the append-only ledger.
 * Lots/serials/expiry appear only with real data; nothing is invented or discarded.
 */

const VIEWS: TabOption[] = [
  { value: "incidencias", label: "Incidencias" },
  { value: "inspecciones", label: "Inspecciones" },
  { value: "discrepancias", label: "Discrepancias" },
  { value: "cuarentena", label: "Cuarentena" },
  { value: "dañados", label: "Dañados" },
  { value: "devoluciones", label: "Devoluciones" },
  { value: "proveedores", label: "Proveedores" },
  { value: "lotes", label: "Lotes y seriales" },
  { value: "caducidad", label: "Caducidad" },
  { value: "trazabilidad", label: "Trazabilidad" },
];

const TONE: Partial<Record<QualityStatus, Parameters<typeof StatusBadge>[0]["tone"]>> = {
  detectada: "warning",
  "en-revision": "progress",
  "pendiente-inspeccion": "warning",
  "en-cuarentena": "critical",
  "accion-requerida": "critical",
  resuelta: "positive",
  cerrada: "positive",
  rechazada: "neutral",
  archivada: "neutral",
};

export function QualityBoard() {
  const ledger = useLedger<InventoryMovement>(
    "inventory:movements",
    INVENTORY_SCHEMA_VERSION,
    isMovement,
  );
  const receipts = useLocalCollection<Receipt>("receiving:list");
  const returns = useVersionedCollection<SalesReturn>(
    "returns:list",
    RETURNS_SCHEMA_VERSION,
    isReturn,
  );
  const suppliers = useLocalCollection<Supplier>("suppliers:list");
  const incidents = useVersionedCollection<QualityIncident>(
    "quality:incidents",
    QUALITY_SCHEMA_VERSION,
    isQualityIncident,
  );

  const [view, setView] = useState("incidencias");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [descr, setDescr] = useState("");

  const signals = useMemo(
    () => deriveQualitySignals(ledger.entries, receipts.items, returns.items),
    [ledger.entries, receipts.items, returns.items],
  );
  const balances = useMemo(() => deriveBalances(ledger.entries), [ledger.entries]);
  const selected = incidents.items.find((i) => i.id === selectedId) ?? null;

  function createIncident() {
    if (!descr.trim()) return;
    const now = new Date().toISOString();
    incidents.add({
      id: localId(),
      type: "manual",
      entityRef: "—",
      sku: null,
      supplier: null,
      warehouse: null,
      location: null,
      qty: null,
      unit: null,
      condition: null,
      severity: "media",
      status: "detectada",
      description: descr.trim(),
      evidence: null,
      actor: "operador-local",
      responsible: null,
      reason: null,
      correlationId: null,
      source: "local",
      version: QUALITY_SCHEMA_VERSION,
      at: now,
      history: [{ at: now, actor: "operador-local", action: "Incidencia detectada" }],
    });
    setDescr("");
  }

  function releaseQuarantine(sku: string, warehouse: string, qty: number) {
    const ms = buildQuarantineRelease(
      { sku, warehouse, qty, actor: "operador-local", reason: "Liberación aprobada" },
      undefined,
      localId,
    );
    if (ms.length) ledger.appendMany(ms);
  }

  const incidentCols: Column<QualityIncident>[] = [
    {
      key: "d",
      header: "Incidencia",
      render: (i) => <span className="font-medium">{i.description}</span>,
    },
    { key: "sev", header: "Severidad", render: (i) => <Badge kind="neutral">{i.severity}</Badge> },
    {
      key: "st",
      header: "Estado",
      render: (i) => <StatusBadge label={qualityStatusLabel(i.status)} tone={TONE[i.status]} />,
    },
    {
      key: "o",
      header: "",
      align: "right",
      render: (i) => (
        <button
          type="button"
          onClick={() => setSelectedId(i.id)}
          className="text-xs text-muted hover:text-foreground"
        >
          Abrir
        </button>
      ),
    },
  ];

  return (
    <div>
      <SegmentedControl
        options={VIEWS}
        value={view}
        onChange={setView}
        className="mb-4 flex-wrap"
      />

      {view === "incidencias" ? (
        <div>
          <div className="mb-3 flex gap-2">
            <input
              value={descr}
              onChange={(e) => setDescr(e.target.value)}
              placeholder="Describir incidencia real"
              className="flex-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none"
            />
            <button
              type="button"
              onClick={createIncident}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Registrar
            </button>
          </div>
          {incidents.items.length === 0 ? (
            <HonestState
              icon="shield"
              title="Sin incidencias."
              description="La ausencia de incidencias no es garantía de calidad. Registra incidencias reales o relaciona señales de otras vistas."
            />
          ) : (
            <DataTable columns={incidentCols} rows={incidents.items} getKey={(i) => i.id} />
          )}
        </div>
      ) : null}

      {view === "cuarentena" || view === "dañados"
        ? (() => {
            const cond = view === "cuarentena" ? "quarantine" : "damaged";
            const rows = balances.filter((b) =>
              cond === "quarantine" ? b.quarantine > 0 : b.damaged > 0,
            );
            if (rows.length === 0)
              return (
                <HonestState
                  icon="shield"
                  title={`Sin ${view}.`}
                  description="Derivado del ledger; cuarentena y dañado nunca cuentan como disponible."
                />
              );
            return (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-muted/40 text-left text-[0.66rem] uppercase tracking-wider text-faint">
                      <th className="px-3 py-2">SKU</th>
                      <th className="px-3 py-2">Almacén</th>
                      <th className="px-3 py-2 text-right">
                        {view === "cuarentena" ? "Cuarentena" : "Dañado"}
                      </th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((b) => (
                      <tr
                        key={`${b.key}|${b.warehouseId}`}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="px-3 py-2 font-mono text-xs">{b.key}</td>
                        <td className="px-3 py-2">{b.warehouseId}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-warn">
                          {view === "cuarentena" ? b.quarantine : b.damaged}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {view === "cuarentena" ? (
                            <button
                              type="button"
                              onClick={() => releaseQuarantine(b.key, b.warehouseId, b.quarantine)}
                              className="rounded-lg border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
                            >
                              Liberar (movimiento)
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t border-border/70 px-3 py-2 text-[0.66rem] text-faint">
                  Liberar crea movimientos append-only (cuarentena→ok); no edita saldos. Cerrar una
                  incidencia no libera cuarentena por sí solo.
                </div>
              </div>
            );
          })()
        : null}

      {view === "discrepancias" || view === "inspecciones" ? (
        signals.discrepancyReceipts.length === 0 ? (
          <HonestState
            icon="alert"
            title="Sin discrepancias registradas."
            description="Provienen de recepciones cerradas con discrepancias."
          />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {signals.discrepancyReceipts.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
              >
                <span>Recepción {r.poNumber}</span>
                <Link href="/purchasing/receiving" className="text-xs text-accent hover:underline">
                  Abrir recepción →
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {view === "devoluciones" ? (
        <HonestState
          icon="undo"
          title={`${signals.returnsInQuarantineOrDamage} devoluciones a cuarentena/dañado.`}
          description={
            <>
              Detalle y destino en Devoluciones.{" "}
              <Link href="/sales/returns" className="text-accent hover:underline">
                Abrir →
              </Link>{" "}
              No se ejecuta devolución a proveedor ni descarte.
            </>
          }
        />
      ) : null}

      {view === "proveedores" ? (
        <div className="rounded-xl border border-border bg-surface/50 p-4 text-sm">
          <p className="mb-2 text-muted">
            {suppliers.items.length} proveedores. La ausencia de discrepancias{" "}
            <span className="font-medium text-foreground">no</span> marca a un proveedor como
            verificado.
          </p>
          <ul className="flex flex-col gap-1 text-xs">
            {suppliers.items.map((s) => (
              <li key={s.id}>
                {s.name} · {s.verified ? "verificado" : "sin verificar"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {view === "lotes" ? (
        signals.lots.length === 0 ? (
          <HonestState
            icon="box"
            title="Sin lotes ni seriales."
            description="Solo aparecen cuando existe un dato real de lote/serial en una recepción. No se inventan."
          />
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {signals.lots.map((l, i) => (
              <li key={i} className="rounded-lg border border-border/60 px-3 py-1.5 text-xs">
                SKU {l.sku} · lote {l.lot} · {l.source}
              </li>
            ))}
          </ul>
        )
      ) : null}

      {view === "caducidad" ? (
        <HonestState
          icon="alert"
          title="Sin datos de caducidad."
          description="La caducidad solo aparece cuando existe un dato real; no se inventa."
        />
      ) : null}

      {view === "trazabilidad" ? (
        ledger.entries.length === 0 ? (
          <HonestState
            icon="activity"
            title="Sin movimientos que trazar."
            description="La trazabilidad relaciona movimientos por correlationId."
          />
        ) : (
          <ul className="flex flex-col gap-1 text-xs">
            {ledger.entries
              .slice()
              .reverse()
              .slice(0, 100)
              .map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-1.5"
                >
                  <span>
                    <span className="font-mono">{stockKey(m)}</span> · {m.movementType} ·{" "}
                    {m.condition}
                  </span>
                  <span className="text-faint">{m.correlationId ?? "—"}</span>
                </li>
              ))}
          </ul>
        )
      ) : null}

      {selected ? (
        <IncidentDrawer
          key={selected.id}
          incident={selected}
          onClose={() => setSelectedId(null)}
          onChange={(patch) => incidents.update(selected.id, patch)}
        />
      ) : null}
    </div>
  );
}

function IncidentDrawer({
  incident,
  onClose,
  onChange,
}: {
  incident: QualityIncident;
  onClose: () => void;
  onChange: (patch: Partial<QualityIncident>) => void;
}) {
  const [reason, setReason] = useState("");
  const next = QUALITY_TRANSITIONS[incident.status];
  function advance(to: QualityStatus) {
    if (!reason.trim()) return;
    onChange({
      status: to,
      history: [
        ...incident.history,
        {
          at: new Date().toISOString(),
          actor: "operador-local",
          action: `${incident.status} → ${to}: ${reason.trim()}`,
        },
      ],
    });
    setReason("");
  }
  return (
    <DetailDrawer
      open
      onClose={onClose}
      title={incident.description}
      description={`Estado: ${qualityStatusLabel(incident.status)}`}
    >
      <div className="flex flex-col gap-4">
        <section className="grid grid-cols-2 gap-2 text-sm">
          <F label="Severidad" value={incident.severity} />
          <F label="Tipo" value={incident.type} />
          <F label="SKU" value={incident.sku ?? "—"} />
          <F label="Almacén" value={incident.warehouse ?? "—"} />
        </section>
        {next.length > 0 ? (
          <section className="rounded-lg border border-border bg-surface/50 p-3">
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo del cambio"
              className="mb-2 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none"
            />
            <div className="flex flex-wrap gap-1.5">
              {next.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => advance(s)}
                  disabled={!reason.trim()}
                  className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted hover:text-foreground disabled:opacity-50"
                >
                  {qualityStatusLabel(s)}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[0.66rem] text-faint">
              Una incidencia no modifica inventario por sí sola. Cerrar no libera cuarentena; usa la
              vista Cuarentena (movimiento).
            </p>
          </section>
        ) : (
          <p className="text-xs text-faint">Estado terminal.</p>
        )}
        <section>
          <p className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-faint">
            Historial
          </p>
          <ul className="flex flex-col gap-1 text-xs text-muted">
            {incident.history
              .slice()
              .reverse()
              .map((h, i) => (
                <li key={i}>
                  {new Date(h.at).toLocaleString("es")} · {h.action}
                </li>
              ))}
          </ul>
        </section>
      </div>
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
