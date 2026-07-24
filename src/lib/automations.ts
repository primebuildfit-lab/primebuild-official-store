/**
 * Pure automations logic (PBOS-001 · ORDEN 26). Rules are explainable and
 * DETERMINISTIC — never labelled "IA". Protected actions (purchase order,
 * adjustment, publish, remote conflict resolution, cancellation, refund, Shopify
 * revocation, deletion) never execute without authorization. Test mode evaluates
 * against a real entity WITHOUT modifying it. Retries are idempotent; pausing
 * never deletes history.
 */

export const AUTOMATIONS_SCHEMA_VERSION = 1;

export type RuleStatus = "borrador" | "activa" | "pausada" | "error";

/** Actions that must never run automatically without explicit authorization. */
export const PROTECTED_ACTIONS = [
  "enviar-orden-compra",
  "aplicar-ajuste",
  "publicar",
  "resolver-conflicto-remoto",
  "cancelar-pedido",
  "reembolsar",
  "revocar-shopify",
  "eliminar",
] as const;

export type ProtectedAction = (typeof PROTECTED_ACTIONS)[number];

/** Safe (non-executing) actions a rule may propose in this phase. */
export const SAFE_ACTIONS = [
  "crear-tarea",
  "marcar-alerta",
  "preparar-borrador",
  "sugerir",
  "notificar",
] as const;

export function isProtectedAction(a: string): a is ProtectedAction {
  return (PROTECTED_ACTIONS as readonly string[]).includes(a);
}

export interface Rule {
  id: string;
  name: string;
  status: RuleStatus;
  trigger: string;
  conditions: string[];
  actions: string[];
  scope: string;
  environment: "local";
  owner: string;
  version: number;
  lastRun?: string | null;
  result?: string | null;
  errors?: string[];
  history: { at: string; actor: string; action: string }[];
}

export function isRule(x: unknown): x is Rule {
  if (x === null || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  return typeof r.id === "string" && typeof r.name === "string" && Array.isArray(r.actions);
}

export interface TestResult {
  conditionsEvaluated: { condition: string; met: boolean }[];
  proposedActions: string[];
  blockedActions: string[];
  missing: string[];
  executed: false;
}

/**
 * Run a rule in TEST mode against a real entity's fields — evaluates conditions,
 * lists proposed vs blocked (protected) actions and missing data, and NEVER
 * executes anything.
 */
export function testRule(rule: Rule, entity: Record<string, unknown>): TestResult {
  const conditionsEvaluated = rule.conditions.map((condition) => {
    // A condition of the form "field" is met when that field is present & truthy.
    const met = condition in entity && Boolean(entity[condition]);
    return { condition, met };
  });
  const missing = rule.conditions.filter((c) => !(c in entity));
  const blockedActions = rule.actions.filter(isProtectedAction);
  const proposedActions = rule.actions.filter((a) => !isProtectedAction(a));
  return { conditionsEvaluated, proposedActions, blockedActions, missing, executed: false };
}

const STATUS_LABEL: Record<RuleStatus, string> = {
  borrador: "Borrador",
  activa: "Activa",
  pausada: "Pausada",
  error: "Con errores",
};

export function ruleStatusLabel(s: RuleStatus): string {
  return STATUS_LABEL[s];
}
