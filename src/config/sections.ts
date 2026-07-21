import type { IconName } from "@/components/ds/icon";

/**
 * The PrimeBuild Official Store section registry — the single source of truth for
 * navigation. The sidebar, command palette and dashboard all derive from this.
 *
 * PrimeBuild Official Store is the PRODUCT BUILDER / Commerce Admin for
 * PrimeBuild's commercial channel; PrimeBuild Store (the public Shopify
 * storefront) is the product built from here, not a separate project
 * (see docs/architecture/PRODUCT_BUILDER.md).
 *
 * The registry describes the FULL commerce-admin information architecture the
 * PBOS-001 rebuild targets — ten commercial spaces (Inicio · Ventas · Catálogo ·
 * Compras · Inventario · Tienda online · Operación · Rendimiento · Publicación ·
 * Control). Each section declares an honest `status`:
 *
 *   - "live":    the screen exists and reads real data (or an honest not-connected
 *                state). Today these are the read-only Shopify surfaces.
 *   - "planned": the space is defined but not built yet. Its route renders an
 *                honest "espacio definido — aún no construido" state (never fake
 *                data) and names the master order that will build it (`order`).
 *
 * This honesty is architectural: navigation must never imply a capability the app
 * does not have. Icons are Design-System icon names (see components/ds).
 */

export interface Section {
  id: string;
  label: string;
  href: string;
  /** A Design-System icon name (see components/ds/icon.tsx). */
  icon: IconName;
  group: SectionGroup;
  summary: string;
  purpose: string;
  /** Whether the screen is built ("live") or defined but not yet built. */
  status: SectionStatus;
  /** For planned spaces: the master order (PBOS-…-001) that will build it. */
  order?: string;
  /** For planned spaces: the intended scope, shown honestly in the placeholder. */
  scope?: string[];
}

export type SectionStatus = "live" | "planned";

export type SectionGroup =
  | "Inicio"
  | "Ventas"
  | "Catálogo"
  | "Compras"
  | "Inventario"
  | "Tienda online"
  | "Operación"
  | "Rendimiento"
  | "Publicación"
  | "Control";

export const SECTION_GROUPS: SectionGroup[] = [
  "Inicio",
  "Ventas",
  "Catálogo",
  "Compras",
  "Inventario",
  "Tienda online",
  "Operación",
  "Rendimiento",
  "Publicación",
  "Control",
];

export const SECTIONS: Section[] = [
  // ── Inicio ───────────────────────────────────────────────────────────────
  {
    id: "dashboard",
    label: "Resumen",
    href: "/",
    icon: "dashboard",
    group: "Inicio",
    status: "live",
    summary: "Estado comercial de la tienda.",
    purpose:
      "Instantánea en vivo de la tienda oficial primebuildfit: productos, clientes, pedidos recientes e ingresos, canales y actividad, cuando está conectada.",
  },
  {
    id: "tasks",
    label: "Tareas y alertas",
    href: "/tasks",
    icon: "bell",
    group: "Inicio",
    status: "live",
    summary: "Trabajo pendiente y avisos.",
    purpose:
      "Centro de tareas y alertas del operador: pendientes de compras, recepciones, inventario, publicación y calidad, con calendario y avisos priorizados. Nada se inventa: cada alerta nacerá de un hecho real del sistema.",
  },

  // ── Ventas ───────────────────────────────────────────────────────────────
  {
    id: "store-orders",
    label: "Pedidos",
    href: "/store/orders",
    icon: "receipt",
    group: "Ventas",
    status: "live",
    summary: "Pedidos recientes.",
    purpose:
      "Pedidos recientes de la tienda oficial con su estado de pago y cumplimiento, leídos en vivo (solo lectura).",
  },
  {
    id: "sales-drafts",
    label: "Borradores y cotizaciones",
    href: "/sales/drafts",
    icon: "file",
    group: "Ventas",
    status: "live",
    summary: "Pedidos borrador y cotizaciones.",
    purpose:
      "Borradores de pedido y cotizaciones antes de convertirse en pedidos reales. Preparar no cobra ni compromete inventario hasta confirmarse.",
  },
  {
    id: "store-customers",
    label: "Clientes",
    href: "/store/customers",
    icon: "users",
    group: "Ventas",
    status: "live",
    summary: "Clientes de la tienda.",
    purpose:
      "Clientes de la tienda oficial con su número de pedidos y gasto total, leídos en vivo (solo lectura).",
  },
  {
    id: "sales-returns",
    label: "Devoluciones",
    href: "/sales/returns",
    icon: "undo",
    group: "Ventas",
    status: "live",
    summary: "Devoluciones y reingresos.",
    purpose:
      "Gestión de devoluciones: autorización, recepción, inspección y decisión (reingreso a vendible, cuarentena o daño). La mercancía devuelta nunca vuelve a vendible automáticamente.",
  },

  // ── Catálogo ─────────────────────────────────────────────────────────────
  {
    id: "store-products",
    label: "Productos",
    href: "/store/products",
    icon: "box",
    group: "Catálogo",
    status: "live",
    summary: "Catálogo de la tienda.",
    purpose:
      "Productos publicados en la tienda oficial con estado, inventario y precio, leídos en vivo del Admin API de Shopify (solo lectura).",
  },
  {
    id: "store-collections",
    label: "Colecciones",
    href: "/store/collections",
    icon: "layers",
    group: "Catálogo",
    status: "live",
    summary: "Agrupaciones de productos.",
    purpose:
      "Colecciones de la tienda oficial con su número de productos, leídas en vivo del Admin API (solo lectura).",
  },
  {
    id: "catalog-pricing",
    label: "Precios y listas",
    href: "/catalog/pricing",
    icon: "tag",
    group: "Catálogo",
    status: "live",
    summary: "Precios, listas y mercados.",
    purpose:
      "Precios de venta, listas de precios por mercado y reglas de precio del catálogo. Se prepara aquí; publicar en la tienda es un paso separado y explícito.",
  },
  {
    id: "store-discounts",
    label: "Descuentos",
    href: "/store/discounts",
    icon: "percent",
    group: "Catálogo",
    status: "live",
    summary: "Códigos de descuento.",
    purpose:
      "Códigos de descuento de la tienda oficial con su estado y periodo de validez, leídos en vivo del Admin API (solo lectura).",
  },

  // ── Compras ──────────────────────────────────────────────────────────────
  {
    id: "purchasing-quick-buy",
    label: "Compras por volumen",
    href: "/purchasing/quick-buy",
    icon: "bolt",
    group: "Compras",
    status: "live",
    summary: "Compra rápida de almacén.",
    purpose:
      "El núcleo diferenciador: preparar compras grandes sin abrir producto por producto. Cuadrícula tipo hoja de cálculo con pegado, edición por lote, MOQ y múltiplos, tramos de precio, comparación de proveedores, landed cost estimado y distribución por almacén. Guardar una compra rápida NO envía nada al proveedor ni modifica el inventario.",
  },
  {
    id: "purchasing-suppliers",
    label: "Proveedores",
    href: "/purchasing/suppliers",
    icon: "truck",
    group: "Compras",
    status: "live",
    summary: "Catálogo de proveedores.",
    purpose:
      "Proveedores por SKU con supplier SKU, unidad de compra, cantidad por caja, MOQ, precio, moneda, tramos por cantidad, vigencia, lead time y condiciones. Con fuente y última verificación de cada dato.",
  },
  {
    id: "purchasing-orders",
    label: "Órdenes de compra",
    href: "/purchasing/orders",
    icon: "clipboard",
    group: "Compras",
    status: "live",
    summary: "Órdenes de compra con estados reales.",
    purpose:
      "Órdenes de compra con estados reales (borrador, en revisión, aprobada, enviada, confirmada, en tránsito, parcial, recibida, con discrepancias, cerrada, cancelada). Crear o exportar una OC no significa que el proveedor la recibió.",
  },
  {
    id: "purchasing-receiving",
    label: "Recepciones",
    href: "/purchasing/receiving",
    icon: "inbox",
    group: "Compras",
    status: "live",
    summary: "Recepción de mercancía.",
    purpose:
      "Recepción con órdenes parciales, escaneo de barcode, esperado vs recibido, exceso o faltante, producto incorrecto, daños, cuarentena, inspección, lotes, seriales, caducidad y asignación de ubicación. La mercancía dañada o en cuarentena nunca pasa automáticamente a vendible.",
  },

  // ── Inventario ───────────────────────────────────────────────────────────
  {
    id: "inventory-stock",
    label: "Existencias",
    href: "/inventory/stock",
    icon: "package",
    group: "Inventario",
    status: "live",
    summary: "Saldos por SKU, almacén y ubicación.",
    purpose:
      "Inventario propio y profundo: on hand, available, reserved, committed, incoming, damaged, quarantine, safety stock y available to sell, por SKU, almacén y ubicación. El saldo no se edita directamente: toda modificación produce un movimiento auditado.",
  },
  {
    id: "inventory-warehouses",
    label: "Almacenes y ubicaciones",
    href: "/inventory/warehouses",
    icon: "warehouse",
    group: "Inventario",
    status: "live",
    summary: "Estructura física del almacén.",
    purpose:
      "Estructura de almacenes que crece de Almacén → Ubicación hasta Zona → Pasillo → Rack → Nivel → Bin, sin obligar a usar todos los niveles. Incluye recepción, staging, picking, packing, shipping, devoluciones, cuarentena, dañados, overflow y ubicaciones virtuales identificadas.",
  },
  {
    id: "inventory-transfers",
    label: "Transferencias",
    href: "/inventory/transfers",
    icon: "transfer",
    group: "Inventario",
    status: "live",
    summary: "Movimientos entre ubicaciones.",
    purpose:
      "Transferencias de stock entre almacenes y ubicaciones, con mercancía en tránsito y confirmación de recepción. Cada transferencia genera movimientos auditados.",
  },
  {
    id: "inventory-counts",
    label: "Conteos y ajustes",
    href: "/inventory/counts",
    icon: "clipboard-check",
    group: "Inventario",
    status: "live",
    summary: "Conteos cíclicos y ajustes.",
    purpose:
      "Conteos cíclicos y completos, y ajustes de inventario con motivo. Cada ajuste queda como movimiento auditado con su justificación: el saldo nunca se sobrescribe a mano.",
  },
  {
    id: "inventory-replenishment",
    label: "Reposición",
    href: "/inventory/replenishment",
    icon: "refresh",
    group: "Inventario",
    status: "live",
    summary: "Sugerencias de reposición.",
    purpose:
      "Reposición basada en safety stock, incoming y demanda: qué comprar y cuánto, listo para pasar a Compras por volumen. Las sugerencias se explican; no se compran solas.",
  },

  // ── Tienda online ────────────────────────────────────────────────────────
  {
    id: "store",
    label: "Shopify",
    href: "/store",
    icon: "store",
    group: "Tienda online",
    status: "live",
    summary: "Centro de la tienda pública.",
    purpose:
      "Ficha y centro de la tienda oficial primebuildfit (Shopify): nombre, dominio, moneda y plan, leídos en vivo del Admin API (solo lectura). Autoridad por-campo y sincronización se profundizan en PBOS-SHOPIFY-001.",
  },
  {
    id: "online-pages",
    label: "Páginas y navegación",
    href: "/online/pages",
    icon: "file",
    group: "Tienda online",
    status: "live",
    summary: "Páginas y menús del storefront.",
    purpose:
      "Páginas, navegación y menús de la tienda pública, dentro de las capacidades reales de Shopify. Se edita aquí y se publica en un paso explícito y previsualizable.",
  },
  {
    id: "online-design",
    label: "Diseño visual",
    href: "/online/design",
    icon: "palette",
    group: "Tienda online",
    status: "live",
    summary: "Diseño soportado del storefront.",
    purpose:
      "Diseño visual de la tienda dentro de lo que la integración real soporta. No afirma controlar temas completos ni checkout: solo lo administrable de forma verificable.",
  },
  {
    id: "online-content",
    label: "Contenido",
    href: "/online/content",
    icon: "edit",
    group: "Tienda online",
    status: "live",
    summary: "Contenido y medios.",
    purpose:
      "Contenido, medios y SEO de la tienda pública. Los medios se gestionan de forma verificable y se publican en un paso explícito.",
  },
  {
    id: "channels",
    label: "Mercados y canales",
    href: "/channels",
    icon: "megaphone",
    group: "Tienda online",
    status: "live",
    summary: "Canales y marketing externos.",
    purpose:
      "Canales de venta y marketing de la tienda (Google Merchant, Meta, Pinterest, SEO y apps instaladas). Se administran en el panel de Shopify; aquí se enlazan honestamente sin inventar métricas.",
  },
  {
    id: "store-rewards",
    label: "PB Coins",
    href: "/store/rewards",
    icon: "coins",
    group: "Tienda online",
    status: "live",
    summary: "Programa de recompensas.",
    purpose:
      "El programa de recompensas PB Coins de la tienda oficial: estado de conexión y cómo se administran los puntos (backend de rewards). Solo lectura.",
  },

  // ── Operación ────────────────────────────────────────────────────────────
  {
    id: "operations-fulfillment",
    label: "Preparación y envíos",
    href: "/operations/fulfillment",
    icon: "send",
    group: "Operación",
    status: "live",
    summary: "Picking, packing y envío.",
    purpose:
      "Preparación de pedidos: picking, packing y envío, con estados reales. Marcar un envío no lo despacha realmente hasta ejecutarse con el transportista.",
  },
  {
    id: "operations-quality",
    label: "Calidad y trazabilidad",
    href: "/operations/quality",
    icon: "shield",
    group: "Operación",
    status: "planned",
    order: "PBOS-AUDIT-001",
    summary: "Calidad, lotes y trazabilidad.",
    purpose:
      "Calidad y trazabilidad de extremo a extremo: lotes, seriales, caducidad, cuarentena, inspección y evidencia, con historial auditable de cada movimiento.",
    scope: [
      "Lotes y seriales",
      "Caducidad y cuarentena",
      "Inspección con evidencia",
      "Trazabilidad auditable",
    ],
  },

  // ── Rendimiento ──────────────────────────────────────────────────────────
  {
    id: "performance-metrics",
    label: "Métricas",
    href: "/performance/metrics",
    icon: "trending-up",
    group: "Rendimiento",
    status: "live",
    summary: "Métricas con fuente.",
    purpose:
      "Métricas de ventas, inventario, compras y operación, cada una con su fuente explícita. No hay métricas sin origen: nada se estima ni se inventa.",
  },
  {
    id: "performance-costs",
    label: "Costos y márgenes",
    href: "/performance/costs",
    icon: "dollar",
    group: "Rendimiento",
    status: "live",
    summary: "Costos, landed cost y márgenes.",
    purpose:
      "Costos por producto, landed cost y márgenes reales, derivados de compras y recepciones. Los márgenes se calculan de datos reales, no de supuestos.",
  },

  // ── Publicación ──────────────────────────────────────────────────────────
  {
    id: "publishing-preview",
    label: "Preview y versiones",
    href: "/publishing/preview",
    icon: "eye",
    group: "Publicación",
    status: "live",
    summary: "Previsualización y versiones.",
    purpose:
      "Preview de los cambios antes de publicarlos y su historial de versiones, con posibilidad de rollback. Nada llega a la tienda pública sin una publicación explícita.",
  },
  {
    id: "publishing-publish",
    label: "Publicación",
    href: "/publishing/publish",
    icon: "upload",
    group: "Publicación",
    status: "live",
    summary: "Publicar a la tienda pública.",
    purpose:
      "Publicación explícita y parcial hacia la tienda pública, con registro de qué se publicó, cuándo y quién. Publicar es siempre una acción deliberada y auditada.",
  },

  // ── Control ──────────────────────────────────────────────────────────────
  {
    id: "control-integrations",
    label: "Integraciones",
    href: "/control/integrations",
    icon: "plug",
    group: "Control",
    status: "live",
    summary: "Shopify y otras integraciones.",
    purpose:
      "Integraciones del builder (Shopify y otras): conexión, autoridad por-campo y mappings, sincronización, webhooks, conflictos y logs. No hay sincronización bidireccional genérica; los conflictos nunca se resuelven en silencio.",
  },
  {
    id: "control-automations",
    label: "Automatizaciones",
    href: "/control/automations",
    icon: "sparkles",
    group: "Control",
    status: "live",
    summary: "Reglas explicables y deterministas.",
    purpose:
      "Reglas y automatizaciones deterministas del builder: disparador, condiciones y acciones, con modo prueba sin efectos. Las acciones protegidas nunca se ejecutan sin autorización.",
  },
  {
    id: "control-audit",
    label: "Auditoría",
    href: "/control/audit",
    icon: "shield",
    group: "Control",
    status: "live",
    summary: "Eventos reales, legibles y enmascarados.",
    purpose:
      "Auditoría comprensible construida desde eventos reales ya registrados en todos los espacios; texto enmascarado, fallos incluidos y exportación con capacidad.",
  },
  {
    id: "settings",
    label: "Configuración",
    href: "/settings",
    icon: "settings",
    group: "Control",
    status: "live",
    summary: "Conexión y entorno.",
    purpose:
      "Estado del entorno de PrimeBuild Official Store: conexión con la tienda, versión del Admin API y parámetros.",
  },
  {
    id: "status",
    label: "Estado",
    href: "/status",
    icon: "activity",
    group: "Control",
    status: "live",
    summary: "Salud de la app y de la tienda.",
    purpose:
      "Estado real de PrimeBuild Official Store y de su fuente de datos (la tienda oficial de Shopify).",
  },
  {
    id: "support",
    label: "Soporte",
    href: "/control/support",
    icon: "help",
    group: "Control",
    status: "live",
    summary: "Ayuda y soporte.",
    purpose:
      "Ayuda, documentación y soporte del operador. Última entrada del panel: un único punto de soporte, sin duplicados.",
  },
];

export function getSection(id: string): Section | undefined {
  return SECTIONS.find((s) => s.id === id);
}

export function sectionsByGroup(group: SectionGroup): Section[] {
  return SECTIONS.filter((s) => s.group === group);
}
