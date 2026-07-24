/**
 * Feature flags de la Official Store (PBOS-DPB-MEGA-FABLE-001 §85).
 *
 * Nombres canónicos compartidos con el contrato PB_EXCHANGE_V1. Los defaults
 * codifican las puertas de la orden: la UI/cotización PB queda habilitada tras
 * verificación; el MODO DINERO REAL permanece deshabilitado hasta que exista
 * proveedor financiero + aprobación del propietario (dirección de tasas +
 * validador anti-arbitraje sin bloqueo). Cambiar un default de dinero real
 * exige una orden explícita — no es un ajuste de configuración cualquiera.
 */

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
  gate?: string;
}

export const FEATURE_FLAGS: FeatureFlag[] = [
  {
    name: "primebuildOfficialStoreEnabled",
    enabled: true,
    description: "Storefront de inventario físico propio (/shop).",
  },
  {
    name: "shopifyCatalogMirrorEnabled",
    enabled: true,
    description: "Espejo del catálogo Shopify (plantillas, metadata, mapeo de variantes).",
  },
  {
    name: "ownedInventoryEnabled",
    enabled: true,
    description: "Inventario propio derivado del ledger con available = onHand − reserved − damaged.",
  },
  {
    name: "pbExchangeV1Enabled",
    enabled: true,
    description: "Perfil PB_EXCHANGE_V1 en modo cotización/prueba (verificado).",
  },
  {
    name: "pbExchangeMoneyModeEnabled",
    enabled: false,
    description: "Dinero real PB. DESHABILITADO hasta proveedor + aprobación del propietario.",
    gate: "Proveedor financiero verificado + dirección de tasas aprobada + anti-arbitraje sin bloqueo",
  },
  {
    name: "pbTransferFeeEnabled",
    enabled: true,
    description: "Comisión del 1% en transferencias PB (solo transferencias; nunca compras).",
  },
  {
    name: "pbStorePricingEnabled",
    enabled: true,
    description: "Precio principal PB con VN = VA × 0.90 (política versionada).",
  },
  {
    name: "crossAppPbExchangeEnabled",
    enabled: true,
    description: "Contratos PB compartidos con CoinOS/Nexus/Internal OS/Partnera/Eventra.",
  },
];

export function flagEnabled(name: string): boolean {
  return FEATURE_FLAGS.find((f) => f.name === name)?.enabled ?? false;
}
