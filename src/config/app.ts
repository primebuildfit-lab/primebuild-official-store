/**
 * Static application identity for PrimeBuild Official Store.
 *
 * PrimeBuild Official Store is the PRODUCT BUILDER for PrimeBuild's commercial
 * channel: the environment from which PrimeBuild Store — website, future app,
 * catalog, checkout and every public channel — is designed, configured,
 * administered, analysed, published and evolved.
 *
 * It is NOT the store, NOT the storefront and NOT what a customer uses.
 * PrimeBuild Store is the product this Builder produces, not a separate project.
 * See docs/architecture/PRODUCT_BUILDER.md for the normative definition.
 *
 * Its current capability is READ-ONLY, which is declared architectural debt: the
 * Builder role requires writing and this implementation cannot write yet. Do not
 * infer capability from the role, in either direction.
 *
 * It is an independent application that belongs ONLY to PrimeBuild. It is not
 * CoinOS, not PrimeBuild Internal OS, not Eventra and not Partnera. It fabricates
 * nothing: when the product's data source is not connected, every screen shows an
 * honest empty state instead of inventing products, orders, customers or revenue.
 */
import { PRODUCT_VERSION } from "./version";

export const app = {
  name: "PrimeBuild Official Store",
  shortName: "Official Store",
  brand: "PrimeBuild",
  /**
   * The canonical admin subtitle. The primary identity is shown, verbatim, as
   * two lines: `name` then `adminSubtitle` (see src/config/identity.ts). It fixes
   * the app as a commerce & inventory admin — never Internal OS, never a
   * Shopify/Store admin, never the public store.
   */
  adminSubtitle: "Commerce & Inventory Admin",
  /** What this application IS, for guards and tests (see identity.ts). */
  classification: "product-builder-admin" as const,
  tagline: "El Commerce Admin de PrimeBuild",
  description:
    "El Product Builder / Commerce Admin de PrimeBuild: ventas, catálogo, compras por volumen, inventario propio, almacenes, operación, rendimiento, publicación y la tienda online de Shopify, desde un solo panel. No es la tienda ni el storefront: PrimeBuild Store es el producto que se construye desde aquí. Hoy las superficies de Shopify funcionan en solo lectura y los espacios operativos están definidos y se construyen orden por orden. App independiente; nada se inventa.",
  /** Canonical product version (build-injected from package.json — see version.ts). */
  version: PRODUCT_VERSION,
  /** Owner-facing note reinforcing that nothing here fabricates data. */
  honesty:
    "Ninguna pantalla inventa datos: las superficies de Shopify son solo lectura y muestran un estado vacío honesto si la tienda no está conectada; los espacios aún no construidos lo dicen abiertamente en vez de simular datos.",
} as const;

export type AppIdentity = typeof app;
