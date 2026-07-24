/**
 * Pure Shopify-center logic (PBOS-001 · ORDEN 16). Shopify is an external channel,
 * never another admin. Connection is only ever asserted from functional evidence
 * (a real successful read), never from the mere presence of env vars, docs, files
 * or old URLs. Data ownership is per-field with an explicit direction — there is
 * NO generic bidirectional sync. No admin URL is fabricated from a store name.
 */

export const SHOPIFY_SCHEMA_VERSION = 1;

/**
 * Allowed per-field sync directions. A generic "bidireccional" is deliberately
 * absent — bidirectionality must be expressed field-by-field.
 */
export type SyncDirection =
  | "primebuild-shopify"
  | "shopify-primebuild"
  | "solo-lectura"
  | "no-sincronizar"
  | "transicion"
  | "pendiente";

export const ALLOWED_DIRECTIONS: SyncDirection[] = [
  "primebuild-shopify",
  "shopify-primebuild",
  "solo-lectura",
  "no-sincronizar",
  "transicion",
  "pendiente",
];

export const DIRECTION_LABEL: Record<SyncDirection, string> = {
  "primebuild-shopify": "PrimeBuild → Shopify",
  "shopify-primebuild": "Shopify → PrimeBuild",
  "solo-lectura": "Solo lectura",
  "no-sincronizar": "No sincronizar",
  transicion: "Transición controlada",
  pendiente: "Pendiente de decisión",
};

export type CanonicalSource = "PrimeBuild" | "Shopify" | "Pendiente";

export interface FieldMapping {
  id: string;
  entity: string;
  field: string;
  canonicalSource: CanonicalSource;
  direction: SyncDirection;
  conflictPolicy: "manual" | "fuente-canonica" | "pendiente";
  status: "activo" | "pendiente";
}

/**
 * The default ownership contract. PrimeBuild owns supplier/cost/MOQ/pack/
 * warehouses/locations/physical inventory/damaged/quarantine/replenishment;
 * Shopify owns storefront/checkout/public orders/observed payment/publication.
 * This is configuration scaffolding (the mapping contract), not business data.
 */
export const DEFAULT_MAPPINGS: FieldMapping[] = [
  m("Producto", "Proveedor", "PrimeBuild", "no-sincronizar"),
  m("Producto", "Costo interno", "PrimeBuild", "no-sincronizar"),
  m("Producto", "MOQ", "PrimeBuild", "no-sincronizar"),
  m("Producto", "Pack size", "PrimeBuild", "no-sincronizar"),
  m("Inventario", "Almacenes", "PrimeBuild", "no-sincronizar"),
  m("Inventario", "Ubicaciones", "PrimeBuild", "no-sincronizar"),
  m("Inventario", "Inventario físico", "PrimeBuild", "transicion"),
  m("Inventario", "Dañado", "PrimeBuild", "no-sincronizar"),
  m("Inventario", "Cuarentena", "PrimeBuild", "no-sincronizar"),
  m("Inventario", "Reposición", "PrimeBuild", "no-sincronizar"),
  m("Storefront", "Contenido público", "Shopify", "solo-lectura"),
  m("Checkout", "Checkout", "Shopify", "solo-lectura"),
  m("Pedido", "Pedido público", "Shopify", "shopify-primebuild"),
  m("Pago", "Estado de pago", "Shopify", "solo-lectura"),
  m("Publicación", "Estado de publicación", "Shopify", "pendiente"),
  m("Producto", "Precio de venta", "Pendiente", "pendiente"),
  m("Producto", "Disponibilidad publicada", "Pendiente", "pendiente"),
];

function m(
  entity: string,
  field: string,
  canonicalSource: CanonicalSource,
  direction: SyncDirection,
): FieldMapping {
  return {
    id: `${entity}:${field}`,
    entity,
    field,
    canonicalSource,
    direction,
    conflictPolicy: canonicalSource === "Pendiente" ? "pendiente" : "fuente-canonica",
    status: canonicalSource === "Pendiente" || direction === "pendiente" ? "pendiente" : "activo",
  };
}

/** True only if a direction is one of the allowed, non-generic-bidirectional set. */
export function isAllowedDirection(d: string): d is SyncDirection {
  return (ALLOWED_DIRECTIONS as string[]).includes(d);
}

export interface MappingOverride {
  id: string;
  direction?: SyncDirection;
  conflictPolicy?: FieldMapping["conflictPolicy"];
}

/** Merge operator overrides onto the default mapping contract (by id). */
export function mergeMappings(
  defaults: FieldMapping[],
  overrides: MappingOverride[],
): FieldMapping[] {
  const byId = new Map(overrides.map((o) => [o.id, o]));
  return defaults.map((d) => {
    const o = byId.get(d.id);
    if (!o) return d;
    return {
      ...d,
      direction: o.direction ?? d.direction,
      conflictPolicy: o.conflictPolicy ?? d.conflictPolicy,
    };
  });
}

/**
 * The verified public store URL, or null. Only a real, https, token-free URL
 * (provided by Shopify as the primary domain) is returned; an admin URL is never
 * fabricated from a store name.
 */
export function verifiedPublicUrl(primaryUrl: string | null | undefined): string | null {
  if (!primaryUrl) return null;
  try {
    const u = new URL(primaryUrl);
    if (u.protocol !== "https:") return null;
    if (u.username || u.password) return null;
    if (/token|secret|password|api[_-]?key|shpat_/i.test(u.href)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export interface SyncConflict {
  id: string;
  entity: string;
  field: string;
  localValue: string;
  remoteValue: string;
  localAt: string;
  remoteAt: string;
  authority: CanonicalSource;
  status: "detectado" | "resuelto-local" | "resuelto-remoto" | "ignorado" | "cerrado";
  reason?: string;
  history: { at: string; actor: string; action: string; reason: string }[];
}
