import "server-only";
import { getStoreConfig, StoreNotConnectedError } from "./config";
import { logger } from "@/server/observability/logger";

/**
 * Minimal READ-ONLY client for the Shopify Admin GraphQL API.
 *
 * Hard safety rails:
 *  - Only GraphQL *queries* are permitted. Any operation containing a top-level
 *    `mutation` is rejected before it ever leaves the process, so this client
 *    can never modify the live `primebuildfit` store.
 *  - Requests time out (no hanging screens) and never print the access token.
 */

const REQUEST_TIMEOUT_MS = 10_000;

export class StoreRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "StoreRequestError";
  }
}

/** Reject anything that is not a pure read query. */
function assertReadOnly(query: string): void {
  // Strip block/line comments, then look for a `mutation` operation keyword.
  const stripped = query.replace(/#[^\n]*/g, "").replace(/"""[\s\S]*?"""/g, '""');
  if (/\bmutation\b/i.test(stripped)) {
    throw new StoreRequestError("Refused: the Store client is read-only and cannot run mutations.");
  }
}

export async function shopifyQuery<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  assertReadOnly(query);
  const cfg = getStoreConfig();
  const url = `https://${cfg.domain}/admin/api/${cfg.apiVersion}/graphql.json`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": cfg.token,
        Accept: "application/json",
      },
      body: JSON.stringify({ query, variables: variables ?? {} }),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    throw new StoreRequestError(
      aborted ? "Shopify request timed out." : "Could not reach the Shopify store.",
    );
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401 || res.status === 403) {
    throw new StoreRequestError("Shopify rejected the credentials (unauthorized).", res.status);
  }
  if (!res.ok) {
    throw new StoreRequestError(`Shopify Admin API returned HTTP ${res.status}.`, res.status);
  }

  const json = (await res.json()) as {
    data?: T;
    errors?: Array<{ message: string }>;
  };
  if (json.errors && json.errors.length > 0) {
    await logger.warn("Shopify Admin API returned errors", {
      context: { count: json.errors.length, first: json.errors[0]?.message },
    });
    throw new StoreRequestError(json.errors[0]?.message ?? "Shopify query error.");
  }
  if (!json.data) throw new StoreRequestError("Shopify returned an empty response.");
  return json.data;
}

export { StoreNotConnectedError };
