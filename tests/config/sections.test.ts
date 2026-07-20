import { describe, it, expect } from "vitest";
import { SECTIONS, SECTION_GROUPS, getSection, sectionsByGroup } from "@/config/sections";

/**
 * The section registry is the single source of truth for navigation across the
 * whole PrimeBuild Official Store commerce admin, so its integrity — and its
 * honesty (live vs planned) — is guarded here.
 */
describe("section registry", () => {
  it("defines the full commerce-admin surface", () => {
    expect(SECTIONS.length).toBe(35);
  });

  it("has unique ids and unique hrefs", () => {
    const ids = SECTIONS.map((s) => s.id);
    const hrefs = SECTIONS.map((s) => s.href);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("exposes the ten commercial spaces", () => {
    expect(SECTION_GROUPS).toEqual([
      "Inicio",
      "Ventas",
      "Catálogo",
      "Compras",
      "Inventario",
      "Tienda online",
      "Operación",
      "Rendimiento",
      "Publicación",
      "Control",
    ]);
  });

  it("places every section in a known group", () => {
    for (const s of SECTIONS) {
      expect(SECTION_GROUPS).toContain(s.group);
    }
  });

  it("keeps the read-only Shopify surface live and under /store", () => {
    for (const id of [
      "store",
      "store-products",
      "store-collections",
      "store-orders",
      "store-customers",
      "store-discounts",
      "store-rewards",
    ]) {
      expect(getSection(id), `missing section ${id}`).toBeDefined();
    }
    // Every store module (id starts with "store") is under the /store namespace.
    for (const s of SECTIONS.filter((x) => x.id.startsWith("store"))) {
      expect(s.href.startsWith("/store")).toBe(true);
    }
  });

  it("does not carry internal-OS-only modules (they live in PrimeBuild Internal OS)", () => {
    for (const id of ["operations", "links", "notes"]) {
      expect(getSection(id), `unexpected internal module ${id}`).toBeUndefined();
    }
  });

  it("every section has a label, summary and purpose", () => {
    for (const s of SECTIONS) {
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.summary.length).toBeGreaterThan(0);
      expect(s.purpose.length).toBeGreaterThan(0);
    }
  });

  it("is honest: planned sections name the order that builds them; live ones do not", () => {
    for (const s of SECTIONS) {
      expect(["live", "planned"]).toContain(s.status);
      if (s.status === "planned") {
        expect(s.order, `planned ${s.id} must name its order`).toMatch(/^PBOS-[A-Z-]+-001$/);
      } else {
        expect(s.order, `live ${s.id} must not claim a planned order`).toBeUndefined();
      }
    }
  });

  it("has at least one live space and several planned ones", () => {
    const live = SECTIONS.filter((s) => s.status === "live");
    const planned = SECTIONS.filter((s) => s.status === "planned");
    expect(live.length).toBeGreaterThan(0);
    expect(planned.length).toBeGreaterThan(0);
  });

  it("lists Soporte exactly once and as the last entry", () => {
    const supports = SECTIONS.filter((s) => s.id === "support");
    expect(supports.length).toBe(1);
    expect(SECTIONS.at(-1)?.id).toBe("support");
  });

  it("groups partition the registry", () => {
    const grouped = SECTION_GROUPS.flatMap((g) => sectionsByGroup(g));
    expect(grouped.length).toBe(SECTIONS.length);
  });
});
