import { describe, it, expect } from "vitest";
import {
  ALLOWED_DIRECTIONS,
  DEFAULT_MAPPINGS,
  isAllowedDirection,
  mergeMappings,
  verifiedPublicUrl,
} from "@/lib/shopify-center";

describe("shopify center (PBOS ORDEN 16)", () => {
  it("has no generic bidirectional direction", () => {
    expect((ALLOWED_DIRECTIONS as string[]).includes("bidireccional")).toBe(false);
    expect(isAllowedDirection("bidireccional")).toBe(false);
    expect(isAllowedDirection("solo-lectura")).toBe(true);
  });

  it("owns the right fields on each side", () => {
    const cost = DEFAULT_MAPPINGS.find((m) => m.field === "Costo interno")!;
    const payment = DEFAULT_MAPPINGS.find((m) => m.field === "Estado de pago")!;
    expect(cost.canonicalSource).toBe("PrimeBuild");
    expect(cost.direction).toBe("no-sincronizar");
    expect(payment.canonicalSource).toBe("Shopify");
    expect(payment.direction).toBe("solo-lectura");
  });

  it("merges overrides onto the default contract by id", () => {
    const merged = mergeMappings(DEFAULT_MAPPINGS, [
      { id: "Producto:Precio de venta", direction: "primebuild-shopify" },
    ]);
    expect(merged.find((m) => m.id === "Producto:Precio de venta")!.direction).toBe(
      "primebuild-shopify",
    );
    // Unrelated rows are unchanged.
    expect(merged.find((m) => m.field === "Costo interno")!.direction).toBe("no-sincronizar");
  });

  it("returns a verified public URL only, never fabricates or leaks tokens", () => {
    expect(verifiedPublicUrl("https://primebuildfit.com")).toBe("https://primebuildfit.com/");
    expect(verifiedPublicUrl(null)).toBeNull();
    expect(verifiedPublicUrl("http://insecure.com")).toBeNull();
    expect(verifiedPublicUrl("https://x.com/?access_token=shpat_1")).toBeNull();
  });
});
