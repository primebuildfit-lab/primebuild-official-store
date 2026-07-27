import { describe, it, expect } from "vitest";
import { app } from "@/config/app";
import {
  IDENTITY,
  FORBIDDEN_IDENTITIES,
  isForbiddenIdentity,
  assertCanonicalIdentity,
} from "@/config/identity";
import { SECTIONS } from "@/config/sections";

/**
 * The identity boundary (PBOS-001 · ORDEN 0.C). Official Store must present
 * itself, exactly, as "PrimeBuild Official Store / Commerce & Inventory Admin",
 * and must never masquerade as the Internal OS, a Shopify/Store admin, the public
 * store, or a client. These tests fail if that boundary is ever blurred.
 */
describe("identity boundary", () => {
  it("shows the exact canonical identity", () => {
    expect(IDENTITY.title).toBe("PrimeBuild Official Store");
    expect(IDENTITY.subtitle).toBe("Commerce & Inventory Admin");
    expect(app.name).toBe(IDENTITY.title);
    expect(app.adminSubtitle).toBe(IDENTITY.subtitle);
  });

  it("classifies itself as a product-builder admin", () => {
    expect(app.classification).toBe("product-builder-admin");
  });

  it("assertCanonicalIdentity passes for the real identity", () => {
    expect(() => assertCanonicalIdentity()).not.toThrow();
    expect(assertCanonicalIdentity()).toEqual(IDENTITY);
  });

  it("rejects every forbidden identity, case-insensitively", () => {
    for (const forbidden of FORBIDDEN_IDENTITIES) {
      expect(isForbiddenIdentity(forbidden)).toBe(true);
      expect(isForbiddenIdentity(forbidden.toUpperCase())).toBe(true);
      expect(isForbiddenIdentity(`  ${forbidden}  `)).toBe(true);
    }
  });

  it("does not treat its own identity as forbidden", () => {
    expect(isForbiddenIdentity(IDENTITY.title)).toBe(false);
    expect(isForbiddenIdentity(IDENTITY.subtitle)).toBe(false);
  });

  it("forbids the Internal OS, the Shopify/Store admin, the public store and client", () => {
    for (const id of [
      "PrimeBuild Internal OS",
      "PrimeBuild Store Admin",
      "PrimeBuild Store",
      "Shopify Admin",
      "Client",
    ]) {
      expect(FORBIDDEN_IDENTITIES).toContain(id);
    }
  });

  it("does not forbid a bare 'Shopify' — it is a legitimate module label", () => {
    expect(isForbiddenIdentity("Shopify")).toBe(false);
  });

  it("no navigation label adopts a forbidden identity", () => {
    for (const s of SECTIONS) {
      expect(isForbiddenIdentity(s.label), `section ${s.id} label is a forbidden identity`).toBe(
        false,
      );
    }
  });
});
