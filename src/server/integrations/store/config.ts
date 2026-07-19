import "server-only";

/**
 * Connection configuration for the PrimeBuild Official Store (Shopify).
 *
 * PrimeBuild Official Store reads the live `primebuildfit` storefront through the
 * Shopify Admin API in READ-ONLY mode. It degrades honestly: when the store is
 * not connected (no credentials in the environment) every Store screen renders
 * an explicit "store not connected" state instead of fabricating products,
 * orders, customers or revenue.
 *
 * Required environment variables to connect:
 *   SHOPIFY_STORE_DOMAIN        e.g. "primebuildfit.myshopify.com"
 *   SHOPIFY_ADMIN_ACCESS_TOKEN  an Admin API access token (read scopes only)
 * Optional:
 *   SHOPIFY_API_VERSION         defaults to a recent stable version
 *
 * SAFETY CONTRACT: this module NEVER writes to the store. It only issues
 * read-only Admin GraphQL queries.
 */

export const STORE_API_VERSION_DEFAULT = "2025-01";

export interface StoreConfig {
  domain: string;
  token: string;
  apiVersion: string;
}

/** Thrown by store data access when no store credentials are configured. */
export class StoreNotConnectedError extends Error {
  constructor() {
    super(
      "The PrimeBuild Official Store is not connected. Set SHOPIFY_STORE_DOMAIN and " +
        "SHOPIFY_ADMIN_ACCESS_TOKEN in .env to read the live storefront (read-only).",
    );
    this.name = "StoreNotConnectedError";
  }
}

function readDomain(): string | null {
  const raw = process.env.SHOPIFY_STORE_DOMAIN?.trim();
  if (!raw) return null;
  // Normalise: strip protocol and trailing slash; keep the host only.
  return raw.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

export function isStoreConnected(): boolean {
  return Boolean(readDomain() && process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim());
}

/**
 * Returns the store connection config, or throws `StoreNotConnectedError` if the
 * credentials are not set. Server-only. The token is never logged.
 */
export function getStoreConfig(): StoreConfig {
  const domain = readDomain();
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim();
  if (!domain || !token) throw new StoreNotConnectedError();
  return {
    domain,
    token,
    apiVersion: process.env.SHOPIFY_API_VERSION?.trim() || STORE_API_VERSION_DEFAULT,
  };
}

/** A safe, human-facing label for the connected store (never exposes the token). */
export function storeDisplayDomain(): string | null {
  return readDomain();
}
