import { describe, it, expect } from "vitest";
import { SECTIONS, SECTION_GROUPS, getSection, sectionsByGroup } from "@/config/sections";

/**
 * The section registry is the single source of truth for navigation across the
 * whole PrimeBuild Official Store console, so its integrity is guarded here.
 */
describe("section registry", () => {
  it("defines the expected set of modules", () => {
    expect(SECTIONS.length).toBe(11);
  });

  it("has unique ids and unique hrefs", () => {
    const ids = SECTIONS.map((s) => s.id);
    const hrefs = SECTIONS.map((s) => s.href);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("places every section in a known group", () => {
    for (const s of SECTIONS) {
      expect(SECTION_GROUPS).toContain(s.group);
    }
  });

  it("is a store console: it exposes the full read-only store surface", () => {
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

  it("groups partition the registry", () => {
    const grouped = SECTION_GROUPS.flatMap((g) => sectionsByGroup(g));
    expect(grouped.length).toBe(SECTIONS.length);
  });
});
