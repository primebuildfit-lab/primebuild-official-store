/**
 * Static application identity for PrimeBuild Official Store.
 *
 * PrimeBuild Official Store is the official administration console for the
 * PrimeBuild (primebuildfit) Shopify store. It is a READ-ONLY live view of the
 * storefront: catalog, collections, inventory, orders, customers, discounts and
 * the PB Coins rewards program.
 *
 * It is an independent application that belongs ONLY to PrimeBuild. It is not
 * CoinOS, not PrimeBuild Internal OS, not Eventra and not Partnera. It fabricates
 * nothing: when the store is not connected, every screen shows an honest empty
 * state instead of inventing products, orders, customers or revenue.
 */
export const app = {
  name: "PrimeBuild Official Store",
  shortName: "Official Store",
  brand: "PrimeBuild",
  tagline: "La consola oficial de administración de la tienda PrimeBuild",
  description:
    "Consola oficial de administración de la tienda Shopify de PrimeBuild (primebuildfit): una vista en vivo y de solo lectura del catálogo, colecciones, pedidos, clientes, descuentos y el programa PB Coins. App independiente; nada se inventa.",
  version: "0.1.0",
  /** Owner-facing note reinforcing that nothing here fabricates data. */
  honesty:
    "Ninguna pantalla inventa datos: si la tienda no está conectada, se muestra un estado vacío honesto. Solo lectura: esta consola nunca escribe en la tienda.",
} as const;

export type AppIdentity = typeof app;
