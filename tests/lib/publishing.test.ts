import { describe, it, expect } from "vitest";
import {
  canVersionTransition,
  PUBLISH_AUTHORIZED_THIS_PHASE,
  runValidation,
  canPrepareVersion,
} from "@/lib/publishing";
import { defaultDefinition, type StoreDefinition } from "@/lib/store-definition";

const withContent = (): StoreDefinition => ({
  ...defaultDefinition(),
  identity: { name: "PrimeBuild Store" },
  pages: [{ id: "1", title: "Home", slug: "home" }],
  homeBlocks: [{ id: "b", type: "hero" }],
});

describe("preview/publish (PBOS ORDEN 18)", () => {
  it("keeps states distinct and blocks publishing this phase", () => {
    expect(canVersionTransition("validado", "publicado")).toBe(false);
    expect(canVersionTransition("preparado", "autorizado")).toBe(true);
    expect(canVersionTransition("autorizado", "publicado")).toBe(true); // structurally
    expect(PUBLISH_AUTHORIZED_THIS_PHASE).toBe(false); // but gated off
  });

  it("validation fails on an empty definition and passes with content", () => {
    const empty = runValidation(defaultDefinition(), { connected: false });
    expect(canPrepareVersion(empty)).toBe(false); // identity error
    const full = runValidation(withContent(), { connected: false });
    expect(canPrepareVersion(full)).toBe(true); // no error-severity failures
  });

  it("reports Shopify and publishable inventory as info, not blockers", () => {
    const checks = runValidation(withContent(), { connected: false });
    const shopify = checks.find((c) => c.id === "shopify")!;
    const pub = checks.find((c) => c.id === "inventario-publicable")!;
    expect(shopify.severity).toBe("info");
    expect(pub.severity).toBe("info");
    // Info checks never block preparing a version.
    expect(canPrepareVersion(checks)).toBe(true);
  });
});
