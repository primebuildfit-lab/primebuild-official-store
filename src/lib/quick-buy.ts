/**
 * Pure Compra rápida logic (PBOS-001 · ORDEN 7). Manual-first purchase planning.
 * It computes only from known components — an unknown cost never becomes 0, an
 * unknown currency is never assumed, and currencies are never mixed in a total.
 * Nothing here sends an order, contacts a supplier, or touches inventory/Shopify.
 */

export type PurchaseUnit = "unidad" | "paquete" | "caja" | "pallet";

export interface QuickBuyLine {
  id: string;
  sku: string;
  title?: string;
  /** true only when linked to a real known product. */
  recognized: boolean;
  warehouse?: string;
  supplier?: string;
  unit: PurchaseUnit;
  qty: number;
  moq?: number | null;
  multiple?: number | null;
  unitCost?: number | null;
  currency?: string | null;
}

export interface QuickBuyDraft {
  id: string;
  name: string;
  warehouse: string;
  status: "borrador" | "listo-aprobacion";
  lines: QuickBuyLine[];
  updatedAt: string;
}

export interface PastedLine {
  sku: string;
  qty: number;
}

/**
 * Parse pasted spreadsheet rows into {sku, qty}. Accepts tab, comma or
 * whitespace separators; the first token is the SKU, the next numeric token is
 * the quantity (defaults to 1). Blank lines are ignored. No SKU is turned into a
 * product — recognition happens elsewhere against a real catalog.
 */
export function parsePaste(text: string): PastedLine[] {
  const out: PastedLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const tokens = line.split(/[\t,]|\s{2,}|\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    const sku = tokens[0]!;
    let qty = 1;
    for (let i = 1; i < tokens.length; i++) {
      const n = Number(tokens[i]!.replace(",", "."));
      if (Number.isFinite(n) && n > 0) {
        qty = n;
        break;
      }
    }
    out.push({ sku, qty });
  }
  return out;
}

/** Line subtotal — only when unit cost is a finite number and qty > 0. */
export function lineSubtotal(line: Pick<QuickBuyLine, "qty" | "unitCost">): number | null {
  if (line.unitCost == null || !Number.isFinite(line.unitCost)) return null;
  if (!Number.isFinite(line.qty) || line.qty <= 0) return null;
  return line.unitCost * line.qty;
}

/** Per-line validation messages (empty array = valid). */
export function validateLine(line: Pick<QuickBuyLine, "qty" | "moq" | "multiple">): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(line.qty) || line.qty <= 0) {
    errors.push("La cantidad debe ser mayor que 0.");
  }
  if (line.moq != null && Number.isFinite(line.moq) && line.qty < line.moq) {
    errors.push(`Por debajo del MOQ (${line.moq}).`);
  }
  if (
    line.multiple != null &&
    Number.isFinite(line.multiple) &&
    line.multiple > 0 &&
    line.qty % line.multiple !== 0
  ) {
    errors.push(`No es múltiplo de ${line.multiple}.`);
  }
  return errors;
}

export interface GroupTotal {
  group: string;
  currency: string;
  subtotal: number;
  lines: number;
  linesWithoutCost: number;
}

/**
 * Totals grouped by supplier or warehouse, split by currency so amounts in
 * different currencies are never summed together. Lines with an unknown cost are
 * counted separately rather than treated as 0.
 */
export function groupTotals(
  lines: QuickBuyLine[],
  dimension: "supplier" | "warehouse",
): GroupTotal[] {
  const map = new Map<string, GroupTotal>();
  for (const line of lines) {
    const group = (dimension === "supplier" ? line.supplier : line.warehouse) || "Sin asignar";
    const currency = line.currency || "Sin moneda";
    const key = `${group}|||${currency}`;
    const entry = map.get(key) ?? { group, currency, subtotal: 0, lines: 0, linesWithoutCost: 0 };
    entry.lines += 1;
    const sub = lineSubtotal(line);
    if (sub == null) entry.linesWithoutCost += 1;
    else entry.subtotal += sub;
    map.set(key, entry);
  }
  return [...map.values()];
}
