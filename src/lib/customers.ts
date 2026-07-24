/**
 * Pure customer-projection logic (PBOS-001 · ORDEN 22). A MINIMAL projection to
 * operate orders/returns/fulfillment/support — never a general CRM. Contact is
 * masked, addresses are withheld unless needed, no personal data goes to logs,
 * mass export is capability-gated, and segmentation is never invented.
 */

import { maskCustomer } from "./orders";
import type { SalesOrderProjection } from "./orders";
import type { SalesReturn } from "./returns";

export const CUSTOMERS_SCHEMA_VERSION = 1;

export interface CustomerNote {
  id: string;
  customerKey: string;
  at: string;
  text: string;
}

export interface CustomerProjection {
  key: string;
  displayName: string;
  contactMasked: string | null;
  orders: number;
  returns: number;
  source: "local" | "shopify";
  shopifyId?: string;
  lastActivity: string | null;
}

/**
 * Build minimal customer projections from local order/return projections only —
 * grouped by the already-masked customer label; nothing personal is re-derived.
 */
export function aggregateLocalCustomers(
  orders: SalesOrderProjection[],
  returns: SalesReturn[],
): CustomerProjection[] {
  const byKey = new Map<string, CustomerProjection>();
  const orderCustomer = new Map<string, string>(); // orderId -> key

  for (const o of orders) {
    const key = o.customerMasked ?? "Anónimo";
    orderCustomer.set(o.id, key);
    const c =
      byKey.get(key) ??
      ({
        key,
        displayName: key,
        contactMasked: o.customerMasked,
        orders: 0,
        returns: 0,
        source: "local",
        lastActivity: null,
      } satisfies CustomerProjection);
    c.orders += 1;
    if (!c.lastActivity || o.observedAt > c.lastActivity) c.lastActivity = o.observedAt;
    byKey.set(key, c);
  }

  for (const r of returns) {
    const key = orderCustomer.get(r.orderId);
    if (!key) continue;
    const c = byKey.get(key);
    if (c) c.returns += 1;
  }

  return [...byKey.values()];
}

/** Mass export requires an explicit capability; without it, it is blocked. */
export function canMassExport(hasCapability: boolean): { ok: boolean; reason?: string } {
  if (!hasCapability) return { ok: false, reason: "Exportación masiva bloqueada sin capacidad" };
  return { ok: true };
}

/** Re-export the masking helper so customers UI never handles raw contact. */
export { maskCustomer };
