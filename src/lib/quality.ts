/**
 * Pure quality & traceability logic (PBOS-QUALITY-CORRECTIVE-001). It observes and
 * relates only REAL data (movements, receipts, returns). Incidents never modify
 * inventory by themselves; any quantity change goes through the append-only ledger
 * (e.g. releasing quarantine posts compensating movements, never edits a balance).
 * Lots/serials/expiry appear only when a real datum exists; nothing is invented,
 * nothing is discarded, no supplier is "verified" by the absence of discrepancies,
 * and Shopify is never touched.
 */

import { INVENTORY_SCHEMA_VERSION, type InventoryMovement } from "./inventory";
import type { Receipt } from "./receiving";
import type { SalesReturn } from "./returns";

export const QUALITY_SCHEMA_VERSION = 1;

export type QualitySeverity = "baja" | "media" | "alta" | "critica";
export type QualityStatus =
  | "detectada"
  | "en-revision"
  | "pendiente-inspeccion"
  | "en-cuarentena"
  | "accion-requerida"
  | "resuelta"
  | "cerrada"
  | "rechazada"
  | "archivada";

export const QUALITY_TRANSITIONS: Record<QualityStatus, QualityStatus[]> = {
  detectada: ["en-revision", "rechazada"],
  "en-revision": ["pendiente-inspeccion", "accion-requerida", "rechazada"],
  "pendiente-inspeccion": ["en-cuarentena", "accion-requerida", "resuelta"],
  "en-cuarentena": ["accion-requerida", "resuelta"],
  "accion-requerida": ["resuelta", "rechazada"],
  resuelta: ["cerrada"],
  cerrada: ["archivada"],
  rechazada: ["archivada"],
  archivada: [],
};

export function canQualityTransition(from: QualityStatus, to: QualityStatus): boolean {
  return QUALITY_TRANSITIONS[from]?.includes(to) ?? false;
}

export interface QualityIncident {
  id: string;
  type: string;
  entityRef: string;
  sku: string | null;
  supplier: string | null;
  warehouse: string | null;
  location: string | null;
  qty: number | null;
  unit: string | null;
  condition: string | null;
  severity: QualitySeverity;
  status: QualityStatus;
  description: string;
  evidence: string | null;
  actor: string;
  responsible: string | null;
  reason: string | null;
  correlationId: string | null;
  source: "local";
  version: number;
  at: string;
  history: { at: string; actor: string; action: string }[];
}

export function isQualityIncident(x: unknown): x is QualityIncident {
  if (x === null || typeof x !== "object") return false;
  const q = x as Record<string, unknown>;
  return typeof q.id === "string" && typeof q.status === "string";
}

export interface QualitySignals {
  damaged: number;
  quarantine: number;
  discrepancyReceipts: { id: string; poNumber: string }[];
  lots: { sku: string; lot: string; source: string }[];
  returnsInQuarantineOrDamage: number;
}

/** Aggregate real quality signals; never invents lots/serials/expiry. */
export function deriveQualitySignals(
  movements: InventoryMovement[],
  receipts: Receipt[],
  returns: SalesReturn[],
): QualitySignals {
  let damaged = 0;
  let quarantine = 0;
  for (const m of movements) {
    const q = m.direction === "in" ? m.quantity : -m.quantity;
    if (m.condition === "dañado") damaged += q;
    else if (m.condition === "cuarentena") quarantine += q;
  }
  const discrepancyReceipts = receipts
    .filter((r) => r.status === "con-discrepancias")
    .map((r) => ({ id: r.id, poNumber: r.poNumber }));
  const lots: { sku: string; lot: string; source: string }[] = [];
  for (const r of receipts)
    for (const l of r.lines) if (l.lot) lots.push({ sku: l.sku, lot: l.lot, source: r.poNumber });
  const returnsInQuarantineOrDamage = returns.filter((r) =>
    r.lines.some((l) => l.destination === "cuarentena" || l.destination === "dañado"),
  ).length;
  return { damaged, quarantine, discrepancyReceipts, lots, returnsInQuarantineOrDamage };
}

/**
 * Build the append-only movements that release quantity from quarantine to sound
 * stock: an OUT of quarantine and an IN of ok, sharing a correlationId. Never
 * edits a balance; both are compensating ledger entries.
 */
export function buildQuarantineRelease(
  input: { sku: string; warehouse: string; qty: number; actor: string; reason: string },
  now: string = new Date().toISOString(),
  makeId: () => string = () => `mov_${Math.random().toString(36).slice(2)}`,
): InventoryMovement[] {
  if (!(input.qty > 0)) return [];
  const correlationId = `quality-release:${makeId()}`;
  const common = {
    sku: input.sku,
    warehouseId: input.warehouse,
    quantity: input.qty,
    unit: "unidad",
    sourceType: "calidad",
    correlationId,
    actor: input.actor,
    reason: input.reason,
    occurredAt: now,
    recordedAt: now,
    status: "publicado" as const,
    version: INVENTORY_SCHEMA_VERSION,
  };
  return [
    {
      ...common,
      id: makeId(),
      movementType: "ajuste-negativo",
      condition: "cuarentena",
      direction: "out",
    },
    { ...common, id: makeId(), movementType: "ajuste-positivo", condition: "ok", direction: "in" },
  ];
}

const STATUS_LABEL: Record<QualityStatus, string> = {
  detectada: "Detectada",
  "en-revision": "En revisión",
  "pendiente-inspeccion": "Pendiente de inspección",
  "en-cuarentena": "En cuarentena",
  "accion-requerida": "Acción requerida",
  resuelta: "Resuelta",
  cerrada: "Cerrada",
  rechazada: "Rechazada",
  archivada: "Archivada",
};

export function qualityStatusLabel(s: QualityStatus): string {
  return STATUS_LABEL[s];
}
