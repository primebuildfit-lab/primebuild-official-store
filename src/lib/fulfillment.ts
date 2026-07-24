/**
 * Pure fulfillment logic (PBOS-001 · ORDEN 20). Local picking/packing/shipping
 * over REAL orders only. It never invents carriers, tracking or labels, and it
 * never deducts inventory by editing a balance — the canonical stock deduction is
 * a separate ledger step, deferred here. Shipping stages are distinct and never
 * combined without evidence; confirming a remote shipment is blocked.
 */

export const FULFILLMENT_SCHEMA_VERSION = 1;

export type FulfillmentStatus =
  | "pendiente"
  | "asignado"
  | "picking"
  | "con-faltantes"
  | "preparado"
  | "empacado"
  | "listo-envio"
  | "enviado"
  | "con-incidencia"
  | "completado";

export const FULFILLMENT_TRANSITIONS: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  pendiente: ["asignado", "con-incidencia"],
  asignado: ["picking", "con-incidencia"],
  picking: ["con-faltantes", "preparado", "con-incidencia"],
  "con-faltantes": ["preparado", "con-incidencia"],
  preparado: ["empacado", "con-incidencia"],
  empacado: ["listo-envio", "con-incidencia"],
  "listo-envio": ["enviado", "con-incidencia"],
  enviado: ["completado"],
  "con-incidencia": ["asignado", "picking", "completado"],
  completado: [],
};

export function canFulfillmentTransition(from: FulfillmentStatus, to: FulfillmentStatus): boolean {
  return FULFILLMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export interface FulfillmentLine {
  id: string;
  sku: string;
  required: number;
  picked: number;
}

export interface Fulfillment {
  id: string;
  code: string;
  orderId: string;
  orderName: string;
  warehouse: string;
  status: FulfillmentStatus;
  lines: FulfillmentLine[];
  responsible?: string;
  packages?: number;
  weight?: string;
  dimensions?: string;
  materials?: string;
  /** Observed only — never fabricated. */
  carrierObserved?: string;
  trackingObserved?: string;
  labelObserved?: string;
  /** A local preparation mark — NOT a confirmed shipment. */
  shippedLocally: boolean;
  /** True only with real integration evidence (blocked in this phase). */
  remoteConfirmed: boolean;
  history: {
    at: string;
    actor: string;
    from: FulfillmentStatus | null;
    to: FulfillmentStatus;
    reason: string;
  }[];
  source: "local";
  version: number;
}

export function isFulfillment(x: unknown): x is Fulfillment {
  if (x === null || typeof x !== "object") return false;
  const f = x as Record<string, unknown>;
  return typeof f.id === "string" && typeof f.orderId === "string" && Array.isArray(f.lines);
}

export function lineShortage(line: FulfillmentLine): number {
  return Math.max(0, line.required - line.picked);
}

export function hasShortages(f: Fulfillment): boolean {
  return f.lines.some((l) => lineShortage(l) > 0);
}

/** Remote shipment confirmation is blocked in this phase (external effect). */
export const REMOTE_SHIPMENT_ALLOWED = false;

export type ShippingStage =
  | "preparado-local"
  | "etiqueta-observada"
  | "entregado-transportista"
  | "confirmado-integracion"
  | "enviado-shopify";

/** The honest shipping stage from evidence — never combined without it. */
export function shippingStage(f: Fulfillment): ShippingStage {
  if (f.remoteConfirmed) return "confirmado-integracion";
  if (f.trackingObserved) return "entregado-transportista";
  if (f.labelObserved) return "etiqueta-observada";
  return "preparado-local";
}

const STATUS_LABEL: Record<FulfillmentStatus, string> = {
  pendiente: "Pendiente",
  asignado: "Asignado",
  picking: "Picking",
  "con-faltantes": "Con faltantes",
  preparado: "Preparado",
  empacado: "Empacado",
  "listo-envio": "Listo para enviar",
  enviado: "Enviado",
  "con-incidencia": "Con incidencia",
  completado: "Completado",
};

export function fulfillmentStatusLabel(s: FulfillmentStatus): string {
  return STATUS_LABEL[s];
}

const STAGE_LABEL: Record<ShippingStage, string> = {
  "preparado-local": "Preparado localmente",
  "etiqueta-observada": "Etiqueta observada",
  "entregado-transportista": "Entregado a transportista",
  "confirmado-integracion": "Confirmado por integración",
  "enviado-shopify": "Enviado en Shopify",
};

export function shippingStageLabel(s: ShippingStage): string {
  return STAGE_LABEL[s];
}
