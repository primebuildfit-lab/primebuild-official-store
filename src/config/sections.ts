import type { IconName } from "@/components/ds/icon";

/**
 * The PrimeBuild Official Store section registry — the single source of truth for
 * navigation. The sidebar, command palette and dashboard all derive from this.
 *
 * PrimeBuild Official Store is the PRODUCT BUILDER for PrimeBuild's commercial
 * channel; PrimeBuild Store is the product built from here, not a separate
 * project (see docs/architecture/PRODUCT_BUILDER.md).
 *
 * Every data module is currently READ-ONLY: it reads the live product via the
 * Shopify Admin API and never writes to it. That is declared architectural debt,
 * not the intended end state — the Builder role requires writing. Nothing here
 * fabricates data: modules show an honest "not connected" state until
 * credentials are configured.
 *
 * Sections are grouped by COMMERCIAL AREA (Panel · Catálogo · Ventas · Marketing
 * y canales · Sistema) so the Builder reads like a commerce command-center, not a
 * generic admin panel. Icons are Design-System icon names (see components/ds).
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
}

export type SectionGroup = "Panel" | "Catálogo" | "Ventas" | "Marketing y canales" | "Sistema";

export const SECTION_GROUPS: SectionGroup[] = [
  "Panel",
  "Catálogo",
  "Ventas",
  "Marketing y canales",
  "Sistema",
];

export const SECTIONS: Section[] = [
  // ── Panel ──────────────────────────────────────────────────────────────────
  { id: "dashboard", label: "Dashboard", href: "/", icon: "dashboard", group: "Panel", summary: "Estado comercial de la tienda.", purpose: "Instantánea en vivo de la tienda oficial primebuildfit: productos, clientes, pedidos recientes e ingresos, canales y actividad, cuando está conectada." },
  { id: "store", label: "Resumen", href: "/store", icon: "store", group: "Panel", summary: "Ficha de la tienda oficial.", purpose: "Ficha de la tienda oficial primebuildfit (Shopify): nombre, dominio, moneda y plan, leídos en vivo del Admin API (solo lectura)." },

  // ── Catálogo (solo lectura) ────────────────────────────────────────────────
  { id: "store-products", label: "Productos", href: "/store/products", icon: "box", group: "Catálogo", summary: "Catálogo de la tienda.", purpose: "Productos publicados en la tienda oficial con estado, inventario y precio, leídos en vivo del Admin API de Shopify (solo lectura)." },
  { id: "store-collections", label: "Colecciones", href: "/store/collections", icon: "layers", group: "Catálogo", summary: "Agrupaciones de productos.", purpose: "Colecciones de la tienda oficial con su número de productos, leídas en vivo del Admin API (solo lectura)." },

  // ── Ventas (solo lectura) ──────────────────────────────────────────────────
  { id: "store-orders", label: "Pedidos", href: "/store/orders", icon: "receipt", group: "Ventas", summary: "Pedidos recientes.", purpose: "Pedidos recientes de la tienda oficial con su estado de pago y cumplimiento, leídos en vivo (solo lectura)." },
  { id: "store-customers", label: "Clientes", href: "/store/customers", icon: "users", group: "Ventas", summary: "Clientes de la tienda.", purpose: "Clientes de la tienda oficial con su número de pedidos y gasto total, leídos en vivo (solo lectura)." },

  // ── Marketing y canales ────────────────────────────────────────────────────
  { id: "store-discounts", label: "Descuentos", href: "/store/discounts", icon: "percent", group: "Marketing y canales", summary: "Códigos de descuento.", purpose: "Códigos de descuento de la tienda oficial con su estado y periodo de validez, leídos en vivo del Admin API (solo lectura)." },
  { id: "store-rewards", label: "PB Coins", href: "/store/rewards", icon: "coins", group: "Marketing y canales", summary: "Programa de recompensas.", purpose: "El programa de recompensas PB Coins de la tienda oficial: estado de conexión y cómo se administran los puntos (backend de rewards). Solo lectura." },
  { id: "channels", label: "Canales de venta", href: "/channels", icon: "megaphone", group: "Marketing y canales", summary: "Canales y marketing externos.", purpose: "Canales de venta y marketing de la tienda (Google Merchant, Meta, Pinterest, SEO y apps instaladas). Se administran en el panel de Shopify; aquí se enlazan honestamente sin inventar métricas." },

  // ── Sistema ────────────────────────────────────────────────────────────────
  { id: "settings", label: "Configuración", href: "/settings", icon: "settings", group: "Sistema", summary: "Conexión y entorno.", purpose: "Estado del entorno de PrimeBuild Official Store: conexión con la tienda, versión del Admin API y parámetros." },
  { id: "status", label: "Estado", href: "/status", icon: "activity", group: "Sistema", summary: "Salud de la app y de la tienda.", purpose: "Estado real de PrimeBuild Official Store y de su fuente de datos (la tienda oficial de Shopify)." },
];

export function getSection(id: string): Section | undefined {
  return SECTIONS.find((s) => s.id === id);
}

export function sectionsByGroup(group: SectionGroup): Section[] {
  return SECTIONS.filter((s) => s.group === group);
}
