import { describe, expect, it } from "vitest";
import {
  CONTENT_SLOTS,
  MARKETING_TEMPLATES,
  TEMPLATE_STATES,
  getSection,
  getTemplate,
  isPubliclyNavigable,
} from "@/config/marketing-templates";

describe("registro de plantillas de marketing (MEGA-004 004D)", () => {
  it("define las 14 familias de la orden más la home publicada", () => {
    expect(MARKETING_TEMPLATES.length).toBeGreaterThanOrEqual(14);
    for (const k of [
      "PB_HOME",
      "PB_PRODUCT_LAUNCH",
      "PB_COLLECTION_CAMPAIGN",
      "PB_SEASONAL",
      "PB_FAST_SHIPPING",
      "PB_BULK_BUYER",
      "PB_WAREHOUSE_ARRIVAL",
      "PB_STOCK_DROP",
      "PB_LIMITED_OWNED",
      "PB_PB_SAVINGS",
      "PB_SPORT_LANDING",
      "PB_ESSENTIALS_LANDING",
      "PB_EMAIL_CAPTURE",
      "PB_WAITLIST",
      "PB_REFERRAL",
    ]) {
      expect(getTemplate(k), `falta ${k}`).toBeDefined();
    }
  });

  it("claves estables únicas y direccionables sin ambigüedad", () => {
    const pageKeys = MARKETING_TEMPLATES.map((t) => t.pageKey);
    expect(new Set(pageKeys).size).toBe(pageKeys.length);
    const sectionKeys = MARKETING_TEMPLATES.flatMap((t) => t.sections.map((x) => x.sectionKey));
    expect(new Set(sectionKeys).size).toBe(sectionKeys.length);
    for (const t of MARKETING_TEMPLATES) {
      for (const x of t.sections) {
        expect(x.sectionKey.startsWith(`${t.pageKey}.`)).toBe(true);
        expect(x.contentSlots.length).toBeGreaterThan(0);
        for (const slot of x.contentSlots) expect(CONTENT_SLOTS).toContain(slot);
      }
    }
    expect(getSection("PB_PRODUCT_LAUNCH.PRODUCT_HERO")?.title).toBe("Hero del producto");
    expect(getSection("PB_STOCK_DROP.INVENTORY_PROOF")).toBeDefined();
    expect(getSection("clave-invalida")).toBeUndefined();
  });

  it("estados válidos y los DRAFT jamás navegables en público", () => {
    for (const t of MARKETING_TEMPLATES) {
      expect(TEMPLATE_STATES).toContain(t.publicState);
      if (t.publicState !== "PUBLISHED") {
        expect(isPubliclyNavigable(t)).toBe(false);
      }
    }
    // Solo lo ya existente está PUBLISHED (home y business); el resto DRAFT.
    const published = MARKETING_TEMPLATES.filter((t) => t.publicState === "PUBLISHED").map(
      (t) => t.pageKey,
    );
    expect(published.sort()).toEqual(["PB_BULK_BUYER", "PB_HOME"]);
  });
});
