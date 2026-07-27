/**
 * OfficialStoreProductVisibilityPolicy (PBOS-SCLP-FABLE-002 §12-§13).
 *
 * Separa tres planos: elegibilidad del mirror (todo producto ACTIVE se copia),
 * visibilidad pública del storefront y elegibilidad de inventario propio.
 *
 * Default OBLIGATORIO: ACTIVE_AND_OWNED_STOCK — el catálogo activo de Shopify
 * queda espejado en vivo, pero al público solo llega lo que además tiene stock
 * físico propio disponible. Cambiar a ALL_ACTIVE_PRODUCTS exige confirmación
 * del propietario: sin `PBOS_VISIBILITY_OWNER_CONFIRMED=yes` el modo cae al
 * default y el Admin lo muestra como «pendiente de confirmación».
 */

export const VISIBILITY_MODES = [
  "ACTIVE_AND_OWNED_STOCK",
  "ALL_ACTIVE_PRODUCTS",
  "ACTIVE_AND_MANUALLY_ENABLED",
] as const;
export type VisibilityMode = (typeof VISIBILITY_MODES)[number];

export const DEFAULT_VISIBILITY_MODE: VisibilityMode = "ACTIVE_AND_OWNED_STOCK";

export interface VisibilityPolicy {
  mode: VisibilityMode;
  requestedMode?: VisibilityMode;
  ownerConfirmed: boolean;
  note: string;
}

export function resolveVisibilityPolicy(env: {
  requested?: string;
  ownerConfirmed?: string;
}): VisibilityPolicy {
  const requested = VISIBILITY_MODES.find((m) => m === env.requested);
  const ownerConfirmed = env.ownerConfirmed === "yes";
  if (!requested || requested === DEFAULT_VISIBILITY_MODE) {
    return {
      mode: DEFAULT_VISIBILITY_MODE,
      ownerConfirmed,
      note: "Default de la orden: público solo con producto ACTIVE en Shopify + stock físico propio disponible.",
    };
  }
  if (!ownerConfirmed) {
    return {
      mode: DEFAULT_VISIBILITY_MODE,
      requestedMode: requested,
      ownerConfirmed: false,
      note: `Modo ${requested} solicitado pero SIN confirmación del propietario (PBOS_VISIBILITY_OWNER_CONFIRMED≠yes): se aplica el default.`,
    };
  }
  return {
    mode: requested,
    requestedMode: requested,
    ownerConfirmed: true,
    note: `Modo ${requested} confirmado por el propietario.`,
  };
}

/**
 * ¿Es visible al público un producto espejado? (pura, §12)
 *  - Siempre: sourceStatus ACTIVE (draft/archived/deleted jamás).
 *  - ACTIVE_AND_OWNED_STOCK: además ownedAvailable > 0.
 *  - ACTIVE_AND_MANUALLY_ENABLED: además habilitado a mano por el operador.
 *  - ALL_ACTIVE_PRODUCTS: basta ACTIVE (solo con confirmación del owner).
 */
export function isPubliclyVisible(input: {
  sourceStatus: string | undefined;
  ownedAvailable: number;
  manuallyEnabled: boolean;
  policy: VisibilityPolicy;
}): boolean {
  if (input.sourceStatus !== "ACTIVE") return false;
  switch (input.policy.mode) {
    case "ALL_ACTIVE_PRODUCTS":
      return true;
    case "ACTIVE_AND_MANUALLY_ENABLED":
      return input.manuallyEnabled;
    default:
      return input.ownedAvailable > 0;
  }
}
