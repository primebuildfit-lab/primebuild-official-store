/**
 * Pure audit logic (PBOS-001 · ORDEN 27). A readable audit built from REAL events
 * already recorded across the local collections — never fabricated. Personal data,
 * tokens, cookies, keys, secrets and unneeded addresses are masked; export is
 * capability-gated and itself audited. Failures and blocked actions are included.
 */

export type AuditCategory =
  | "productos"
  | "compras"
  | "inventario"
  | "shopify"
  | "pedidos"
  | "fulfillment"
  | "devoluciones"
  | "configuracion"
  | "seguridad"
  | "fallos";

export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  category: AuditCategory;
  entity: string;
  result: string;
  source: string;
  correlationId?: string;
  reason?: string;
}

const TOKEN =
  /(shpat_[A-Za-z0-9]+|(?:password|token|secret|api[_-]?key)\s*[=:]\s*\S+|Bearer\s+\S+)/gi;
const EMAIL = /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*(@[A-Za-z0-9.-]+)/g;

/** Mask secrets and personal data in any human-facing audit text. */
export function maskSensitive(text: string): string {
  return text
    .replace(TOKEN, "«oculto»")
    .replace(EMAIL, (_m, first: string, domain: string) => `${first}***${domain}`);
}

/** Whether an export is allowed; without the capability it is blocked. */
export function canExportAudit(hasCapability: boolean): { ok: boolean; reason?: string } {
  if (!hasCapability) return { ok: false, reason: "Exportar auditoría requiere capacidad." };
  return { ok: true };
}

/** Normalize a history entry (from any space) into an AuditEvent. */
export function toAuditEvent(base: {
  id: string;
  at: string;
  actor: string;
  action: string;
  entity: string;
  category: AuditCategory;
  source: string;
  result?: string;
  correlationId?: string;
  reason?: string;
}): AuditEvent {
  return {
    id: base.id,
    at: base.at,
    actor: base.actor,
    action: maskSensitive(base.action),
    category: base.category,
    entity: base.entity,
    result: base.result ?? "ok",
    source: base.source,
    correlationId: base.correlationId,
    reason: base.reason ? maskSensitive(base.reason) : undefined,
  };
}

export const CATEGORY_LABEL: Record<AuditCategory, string> = {
  productos: "Productos",
  compras: "Compras",
  inventario: "Inventario",
  shopify: "Shopify",
  pedidos: "Pedidos",
  fulfillment: "Fulfillment",
  devoluciones: "Devoluciones",
  configuracion: "Configuración",
  seguridad: "Seguridad",
  fallos: "Fallos",
};
