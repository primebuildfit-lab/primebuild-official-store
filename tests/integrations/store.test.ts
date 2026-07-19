import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { shopifyQuery } from "@/server/integrations/store/shopify-client";
import { isStoreConnected, storeDisplayDomain } from "@/server/integrations/store/config";

/**
 * Locks the Official Store safety contract: the client is READ-ONLY (mutations
 * are refused before any network call) and connection detection is honest.
 */
describe("official store integration", () => {
  const saved = {
    domain: process.env.SHOPIFY_STORE_DOMAIN,
    token: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
  };

  beforeEach(() => {
    delete process.env.SHOPIFY_STORE_DOMAIN;
    delete process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  });

  afterEach(() => {
    if (saved.domain === undefined) delete process.env.SHOPIFY_STORE_DOMAIN;
    else process.env.SHOPIFY_STORE_DOMAIN = saved.domain;
    if (saved.token === undefined) delete process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
    else process.env.SHOPIFY_ADMIN_ACCESS_TOKEN = saved.token;
  });

  it("refuses mutations before ever hitting the network", async () => {
    process.env.SHOPIFY_STORE_DOMAIN = "primebuildfit.myshopify.com";
    process.env.SHOPIFY_ADMIN_ACCESS_TOKEN = "shpat_test";
    await expect(
      shopifyQuery(`mutation { productUpdate(input: {id: "1"}) { product { id } } }`),
    ).rejects.toThrow(/read-only/i);
  });

  it("reports not-connected when credentials are absent", () => {
    expect(isStoreConnected()).toBe(false);
    expect(storeDisplayDomain()).toBeNull();
  });

  it("normalises the store domain and reports connected when set", () => {
    process.env.SHOPIFY_STORE_DOMAIN = "https://primebuildfit.myshopify.com/";
    process.env.SHOPIFY_ADMIN_ACCESS_TOKEN = "shpat_test";
    expect(isStoreConnected()).toBe(true);
    expect(storeDisplayDomain()).toBe("primebuildfit.myshopify.com");
  });
});
