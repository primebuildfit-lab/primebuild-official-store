/**
 * Pure count/adjustment logic (PBOS-001 · ORDEN 14). Counting never modifies
 * inventory; only an approved adjustment does, and it does so by appending
 * movements — an applied adjustment is never edited or deleted (corrections are
 * compensating movements). A blind count withholds the expected quantity at the
 * DATA level, not with CSS.
 */

import { INVENTORY_SCHEMA_VERSION, type InventoryMovement } from "./inventory";

export const COUNT_SCHEMA_VERSION = 1;

export type CountStatus =
  | "planificado"
  | "en-progreso"
  | "pendiente-revision"
  | "con-diferencias"
  | "aprobado"
  | "aplicado"
  | "cancelado";

export const COUNT_TRANSITIONS: Record<CountStatus, CountStatus[]> = {
  planificado: ["en-progreso", "cancelado"],
  "en-progreso": ["pendiente-revision", "cancelado"],
  "pendiente-revision": ["con-diferencias", "aprobado", "cancelado"],
  "con-diferencias": ["aprobado", "cancelado"],
  aprobado: ["aplicado", "cancelado"],
  aplicado: [],
  cancelado: [],
};

export function canCountTransition(from: CountStatus, to: CountStatus): boolean {
  return COUNT_TRANSITIONS[from]?.includes(to) ?? false;
}

export interface CountLine {
  id: string;
  sku: string;
  expected: number;
  counted: number | null;
}

export interface StockCount {
  id: string;
  code: string;
  warehouseCode: string;
  status: CountStatus;
  /** Methodology options — never on by default without a policy. */
  blind: boolean;
  doubleCount: boolean;
  tolerance: number | null;
  requiresApproval: boolean;
  lines: CountLine[];
  responsible?: string;
  approver?: string;
  startedAt?: string | null;
  closedAt?: string | null;
  version: number;
}

export function isStockCount(x: unknown): x is StockCount {
  if (x === null || typeof x !== "object") return false;
  const c = x as Record<string, unknown>;
  return typeof c.id === "string" && typeof c.warehouseCode === "string" && Array.isArray(c.lines);
}

export function lineDiff(line: CountLine): number | null {
  if (line.counted == null || !Number.isFinite(line.counted)) return null;
  return line.counted - line.expected;
}

/** True when a line's difference exceeds tolerance (or any diff when no tolerance). */
export function exceedsTolerance(line: CountLine, tolerance: number | null): boolean {
  const d = lineDiff(line);
  if (d == null) return false;
  const t = tolerance == null ? 0 : Math.abs(tolerance);
  return Math.abs(d) > t;
}

export function hasDifferences(count: StockCount): boolean {
  return count.lines.some((l) => {
    const d = lineDiff(l);
    return d != null && d !== 0;
  });
}

/**
 * The expected quantity a viewer may see. In a blind count it is withheld
 * (returns null) unless the viewer holds the authorized capability — the value is
 * simply not provided to the renderer, never merely hidden with CSS.
 */
export function visibleExpected(
  line: CountLine,
  opts: { blind: boolean; canSeeExpected: boolean },
): number | null {
  if (opts.blind && !opts.canSeeExpected) return null;
  return line.expected;
}

/** Preconditions for applying an adjustment from a count. */
export function canApplyAdjustment(
  count: StockCount,
  reason: string,
  hasCapability: boolean,
): { ok: boolean; error?: string } {
  if (!hasCapability) return { ok: false, error: "No tienes la capacidad para aplicar ajustes." };
  if (count.status !== "aprobado")
    return { ok: false, error: "El conteo debe estar aprobado antes de aplicar." };
  if (count.lines.some((l) => l.counted == null))
    return { ok: false, error: "Todas las líneas deben estar contadas." };
  if (!reason.trim()) return { ok: false, error: "El motivo es obligatorio." };
  if (count.requiresApproval && !count.approver)
    return { ok: false, error: "La política exige un aprobador." };
  return { ok: true };
}

/**
 * Build the append-only adjustment movements for a count's non-zero differences.
 * Idempotent by correlationId; a re-apply produces nothing. No cost is invented.
 */
export function buildAdjustmentMovements(
  count: StockCount,
  actor: string,
  existing: InventoryMovement[] = [],
  now: string = new Date().toISOString(),
  makeId: () => string = () => `mov_${Math.random().toString(36).slice(2)}`,
): InventoryMovement[] {
  const correlationId = `${count.id}:adj`;
  if (existing.some((m) => m.correlationId === correlationId)) return [];
  return count.lines
    .map((l) => ({ line: l, diff: lineDiff(l) }))
    .filter((x): x is { line: CountLine; diff: number } => x.diff != null && x.diff !== 0)
    .map(({ line, diff }) => ({
      id: makeId(),
      movementType: diff > 0 ? ("ajuste-positivo" as const) : ("ajuste-negativo" as const),
      sku: line.sku || undefined,
      warehouseId: count.warehouseCode,
      quantity: Math.abs(diff),
      unit: "unidad",
      condition: "ok" as const,
      direction: diff > 0 ? ("in" as const) : ("out" as const),
      sourceType: "conteo",
      sourceId: count.id,
      correlationId,
      actor,
      reason: `Ajuste por conteo ${count.code}`,
      occurredAt: now,
      recordedAt: now,
      status: "publicado" as const,
      version: INVENTORY_SCHEMA_VERSION,
    }));
}

const STATUS_LABEL: Record<CountStatus, string> = {
  planificado: "Planificado",
  "en-progreso": "En progreso",
  "pendiente-revision": "Pendiente de revisión",
  "con-diferencias": "Con diferencias",
  aprobado: "Aprobado",
  aplicado: "Aplicado",
  cancelado: "Cancelado",
};

export function countStatusLabel(s: CountStatus): string {
  return STATUS_LABEL[s];
}
