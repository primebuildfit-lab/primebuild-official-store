/**
 * Pure receiving logic (PBOS-001 · ORDEN 10). Receipts are partial-friendly and
 * append-only: a receipt is never overwritten. Damaged or quarantined goods never
 * become available. Until PBOS-INVENTORY-001 exists, receiving records the
 * operational fact only — it does NOT post inventory movements or mark stock
 * updated; the canonical stock update belongs to the inventory block.
 */

export type ReceiptCondition = "ok" | "dañado" | "cuarentena" | "incorrecto";

export type ReceiptStatus =
  "borrador" | "parcial" | "con-discrepancias" | "completada" | "cancelada";

export interface ReceiptLine {
  id: string;
  sku: string;
  title?: string;
  expected: number;
  received: number;
  condition: ReceiptCondition;
  location?: string;
  lot?: string;
}

export interface Receipt {
  id: string;
  poId: string;
  poNumber: string;
  warehouse: string;
  status: ReceiptStatus;
  lines: ReceiptLine[];
  createdAt: string;
  closedAt?: string | null;
  note?: string;
}

/** A line is short, over, or complete against its expected quantity. */
export function classifyLine(
  line: Pick<ReceiptLine, "expected" | "received">,
): "faltante" | "exceso" | "completa" {
  if (line.received < line.expected) return "faltante";
  if (line.received > line.expected) return "exceso";
  return "completa";
}

/** A receipt is discrepant if any line differs from expected or is not "ok". */
export function receiptDiscrepant(lines: ReceiptLine[]): boolean {
  return lines.some((l) => l.received !== l.expected || l.condition !== "ok");
}

/** Quantity that may count toward available stock — only sound, "ok" goods. */
export function soundReceived(line: Pick<ReceiptLine, "received" | "condition">): number {
  return line.condition === "ok" ? Math.max(0, line.received) : 0;
}

/** Total already received for a SKU across prior receipts of a PO (any condition). */
export function receivedSoFar(receipts: Receipt[], poId: string, sku: string): number {
  return receipts
    .filter((r) => r.poId === poId && r.status !== "cancelada")
    .flatMap((r) => r.lines)
    .filter((l) => l.sku === sku)
    .reduce((acc, l) => acc + (Number.isFinite(l.received) ? l.received : 0), 0);
}

/** Pending quantity for an expected line given what prior receipts already took. */
export function pendingFor(expected: number, alreadyReceived: number): number {
  return Math.max(0, expected - alreadyReceived);
}

export interface ConditionTotals {
  ok: number;
  dañado: number;
  cuarentena: number;
  incorrecto: number;
}

export function totalsByCondition(lines: ReceiptLine[]): ConditionTotals {
  const t: ConditionTotals = { ok: 0, dañado: 0, cuarentena: 0, incorrecto: 0 };
  for (const l of lines) t[l.condition] += Number.isFinite(l.received) ? l.received : 0;
  return t;
}
