/**
 * Pure integrations logic (PBOS-001 · ORDEN 25). An honest registry of Official
 * Store's own integrations. Connection is never asserted from an env var, a doc, a
 * component, an empty endpoint or a historical URL — only from evidence. Secrets
 * are never shown. Platform Nexus keeps identity/access; CoinOS keeps finance;
 * EAL-001 keeps the cross-cutting access registry — Official Store consumes or
 * links to them, never duplicating them.
 */

export type IntegrationState =
  | "conectada-verificada"
  | "conectada-sin-verificar"
  | "configuracion-parcial"
  | "no-conectada"
  | "permisos-insuficientes"
  | "fuente-no-disponible"
  | "legacy"
  | "en-transicion"
  | "error"
  | "pendiente-decision";

export interface IntegrationEntry {
  id: string;
  name: string;
  type: string;
  owner: string;
  consumer: string;
  state: IntegrationState;
  environment: string;
  scope: string;
  capabilities: string;
  permissions: string;
  /** A safe reference only — never a secret value. */
  credentialRef: string;
  evidence: string;
  note: string;
  /** A link to the responsible system, or a pending cross-cutting contract. */
  link?: { label: string; kind: "enlace" | "pendiente" };
}

const OWNER = "PrimeBuild Official Store";

function e(
  p: Partial<IntegrationEntry> & Pick<IntegrationEntry, "id" | "name" | "type" | "state" | "note">,
): IntegrationEntry {
  return {
    owner: OWNER,
    consumer: OWNER,
    environment: "local",
    scope: p.scope ?? "—",
    capabilities: p.capabilities ?? "—",
    permissions: p.permissions ?? "—",
    credentialRef: p.credentialRef ?? "sin credencial",
    evidence: p.evidence ?? "sin evidencia",
    link: p.link,
    ...p,
  } as IntegrationEntry;
}

/**
 * The integration registry. Shopify's state is derived from functional evidence
 * (a real read); everything else is honestly not-connected or pending. Nexus/
 * CoinOS/EAL are linked, not duplicated.
 */
export function buildIntegrations(shopifyConnected: boolean): IntegrationEntry[] {
  return [
    e({
      id: "shopify",
      name: "Shopify",
      type: "canal / tienda pública",
      state: shopifyConnected ? "conectada-sin-verificar" : "no-conectada",
      scope: "solo lectura",
      capabilities: "leer productos, pedidos, clientes",
      evidence: shopifyConnected ? "lectura funcional verificada" : "sin evidencia",
      note: "Centro dedicado en Tienda online → Shopify. Escritura bloqueada en esta fase.",
    }),
    e({
      id: "almacenamiento",
      name: "Almacenamiento de archivos",
      type: "storage",
      state: "no-conectada",
      note: "Requerido por Medios; sin proveedor conectado.",
    }),
    e({
      id: "correo",
      name: "Correo",
      type: "email",
      state: "no-conectada",
      note: "Sin proveedor de correo; no se envían comunicaciones reales.",
    }),
    e({
      id: "catalogos",
      name: "Proveedores / catálogos",
      type: "supplier feed",
      state: "pendiente-decision",
      note: "Importación de catálogo de proveedor pendiente de contrato.",
    }),
    e({
      id: "transportistas",
      name: "Transportistas",
      type: "shipping",
      state: "no-conectada",
      note: "Sin transportista; etiquetas/tracking no disponibles.",
    }),
    e({
      id: "impresion",
      name: "Impresión / escaneo",
      type: "hardware",
      state: "fuente-no-disponible",
      note: "Sin hardware; entrada por teclado disponible.",
    }),
    e({
      id: "analytics",
      name: "Analytics",
      type: "BI",
      state: "pendiente-decision",
      note: "Arquitectura de Analytics pendiente: propietario no decidido.",
    }),
    e({
      id: "nexus",
      name: "Platform Nexus",
      type: "identidad / seguridad",
      consumer: OWNER,
      owner: "Platform Nexus",
      state: "en-transicion",
      note: "Identidad, acceso y observación técnica viven en Nexus. Official Store consume capacidades o enlaza; no duplica empleados, roles ni credenciales.",
      link: { label: "Sistema responsable: Platform Nexus", kind: "enlace" },
    }),
    e({
      id: "coinos",
      name: "CoinOS",
      type: "infraestructura financiera",
      owner: "CoinOS",
      consumer: OWNER,
      state: "en-transicion",
      note: "Ledger financiero, balances y pagos viven en CoinOS. Official Store no duplica movimientos financieros.",
      link: { label: "Sistema responsable: CoinOS", kind: "enlace" },
    }),
    e({
      id: "impuestos",
      name: "Servicio de impuestos",
      type: "tax",
      state: "no-conectada",
      note: "Sin servicio fiscal conectado.",
    }),
    e({
      id: "direcciones",
      name: "Validación de direcciones",
      type: "address",
      state: "no-conectada",
      note: "Sin validación de direcciones conectada.",
    }),
    e({
      id: "eal",
      name: "EAL — Ecosystem Access & Launcher",
      type: "acceso transversal",
      owner: "EAL-001",
      consumer: OWNER,
      state: "pendiente-decision",
      note: "El registro y lanzador transversal viven en EAL-001. Official Store no lo duplica; conserva solo accesos contextuales propios. Enlace/contrato estable pendiente.",
      link: { label: "Contrato transversal: EAL-001 (pendiente)", kind: "pendiente" },
    }),
  ];
}

const STATE_LABEL: Record<IntegrationState, string> = {
  "conectada-verificada": "Conectada y verificada",
  "conectada-sin-verificar": "Conectada sin verificar",
  "configuracion-parcial": "Configuración parcial",
  "no-conectada": "No conectada",
  "permisos-insuficientes": "Permisos insuficientes",
  "fuente-no-disponible": "Fuente no disponible",
  legacy: "Legacy",
  "en-transicion": "En transición",
  error: "Error",
  "pendiente-decision": "Pendiente de decisión",
};

export function integrationStateLabel(s: IntegrationState): string {
  return STATE_LABEL[s];
}
