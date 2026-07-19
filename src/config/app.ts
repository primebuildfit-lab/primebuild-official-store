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
export const app = {
  name: "PrimeBuild Official Store",
  shortName: "Official Store",
  brand: "PrimeBuild",
  tagline: "El Product Builder del canal comercial de PrimeBuild",
  description:
    "Entorno desde el que se diseña, configura, administra, analiza, publica y evoluciona PrimeBuild Store: catálogo, colecciones, pedidos, clientes, descuentos y el programa PB Coins. No es la tienda ni el storefront: la tienda es el producto que se construye desde aquí. Hoy funciona en modo solo lectura. App independiente; nada se inventa.",
  version: "0.1.0",
  /** Owner-facing note reinforcing that nothing here fabricates data. */
  honesty:
    "Ninguna pantalla inventa datos: si la tienda no está conectada, se muestra un estado vacío honesto. Solo lectura: esta consola nunca escribe en la tienda.",
} as const;

export type AppIdentity = typeof app;
