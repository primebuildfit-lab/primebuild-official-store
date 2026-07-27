/**
 * Roles y capacidades de la Official Store (PBOS-DPB-MEGA-FABLE-001 §62).
 *
 * Catálogo declarativo: el enforcement real llegará con la identidad
 * compartida de Nexus (§61 — no se crean cuentas independientes). Cada acción
 * sensible de esta app ya exige motivo y actor en su propia superficie; este
 * registro define QUÉ rol podrá ejecutarla cuando la identidad esté conectada.
 * Las capacidades de CoinOS son separadas y no se duplican aquí.
 */

export interface StoreRole {
  id: string;
  label: string;
  capabilities: string[];
}

export const STORE_CAPABILITIES = [
  "store.admin",
  "inventory.receive",
  "inventory.adjust",
  "inventory.transfer",
  "inventory.count",
  "warehouse.manage",
  "fulfillment.operate",
  "pricing.manage",
  "pb-pricing.view",
  "shopify-sync.manage",
  "returns.manage",
  "orders.manage",
  "analytics.view",
  "support.operate",
  "audit.view",
] as const;
export type StoreCapability = (typeof STORE_CAPABILITIES)[number];

export const STORE_ROLES: StoreRole[] = [
  { id: "owner", label: "PrimeBuild Official Store Owner", capabilities: [...STORE_CAPABILITIES] },
  {
    id: "store-admin",
    label: "Store Administrator",
    capabilities: [
      "store.admin",
      "inventory.receive",
      "inventory.adjust",
      "inventory.transfer",
      "inventory.count",
      "warehouse.manage",
      "fulfillment.operate",
      "pricing.manage",
      "pb-pricing.view",
      "shopify-sync.manage",
      "returns.manage",
      "orders.manage",
      "analytics.view",
      "support.operate",
      "audit.view",
    ],
  },
  {
    id: "inventory-manager",
    label: "Inventory Manager",
    capabilities: ["inventory.receive", "inventory.adjust", "inventory.transfer", "inventory.count", "audit.view"],
  },
  { id: "warehouse-manager", label: "Warehouse Manager", capabilities: ["warehouse.manage", "inventory.transfer", "inventory.count"] },
  { id: "fulfillment-operator", label: "Fulfillment Operator", capabilities: ["fulfillment.operate", "orders.manage"] },
  { id: "pricing-manager", label: "Pricing Manager", capabilities: ["pricing.manage", "pb-pricing.view"] },
  { id: "pb-pricing-viewer", label: "PB Pricing Viewer", capabilities: ["pb-pricing.view"] },
  { id: "shopify-sync-manager", label: "Shopify Sync Manager", capabilities: ["shopify-sync.manage"] },
  { id: "returns-manager", label: "Returns Manager", capabilities: ["returns.manage", "orders.manage"] },
  { id: "store-analyst", label: "Store Analyst", capabilities: ["analytics.view", "pb-pricing.view"] },
  { id: "store-support", label: "Store Support", capabilities: ["support.operate", "orders.manage"] },
];

export function roleCan(roleId: string, capability: StoreCapability): boolean {
  return STORE_ROLES.find((r) => r.id === roleId)?.capabilities.includes(capability) ?? false;
}
