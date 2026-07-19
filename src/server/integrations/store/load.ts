import "server-only";
import { isStoreConnected, StoreNotConnectedError } from "./config";

/**
 * Server-component data loader for the Official Store section. When Shopify
 * credentials are absent (or a request fails because of them), Store screens
 * render an explicit "store not connected" state instead of faking a storefront.
 */
export interface StoreLoadResult<T> {
  connected: boolean;
  data: T | null;
  error?: string;
}

export async function loadStore<T>(fn: () => Promise<T>): Promise<StoreLoadResult<T>> {
  if (!isStoreConnected()) {
    return { connected: false, data: null };
  }
  try {
    return { connected: true, data: await fn() };
  } catch (e) {
    if (e instanceof StoreNotConnectedError) return { connected: false, data: null };
    return {
      connected: true,
      data: null,
      error: e instanceof Error ? e.message : "Store request failed",
    };
  }
}
