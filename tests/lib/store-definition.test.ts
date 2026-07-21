import { describe, it, expect } from "vitest";
import {
  BLOCK_TYPES,
  BLOCKED_BLOCK_TYPES,
  defaultDefinition,
  isAllowedBlock,
  validateDefinition,
  diffSummary,
  type StoreDefinition,
} from "@/lib/store-definition";

describe("store definition (PBOS ORDEN 17)", () => {
  it("starts empty and honest: no demo content", () => {
    const d = defaultDefinition();
    expect(d.identity.name).toBe("");
    expect(d.pages).toHaveLength(0);
    expect(d.homeBlocks).toHaveLength(0);
  });

  it("blocks the newsletter block and allows structural ones", () => {
    expect(isAllowedBlock("hero")).toBe(true);
    expect(isAllowedBlock("newsletter")).toBe(false);
    expect((BLOCK_TYPES as string[]).includes("newsletter")).toBe(false);
    expect(BLOCKED_BLOCK_TYPES).toContain("newsletter");
  });

  it("validates identity name and unique page slugs", () => {
    const d: StoreDefinition = {
      ...defaultDefinition(),
      identity: { name: "" },
      pages: [
        { id: "1", title: "A", slug: "a" },
        { id: "2", title: "B", slug: "a" },
      ],
    };
    const res = validateDefinition(d);
    expect(res.ok).toBe(false);
    expect(res.errors.join(" ")).toMatch(/nombre/);
    expect(res.errors.join(" ")).toMatch(/slugs/);
  });

  it("summarizes a diff between two definitions", () => {
    const a = defaultDefinition();
    const b: StoreDefinition = {
      ...a,
      identity: { name: "PrimeBuild Store" },
      pages: [{ id: "1", title: "Home", slug: "home" }],
    };
    const d = diffSummary(a, b);
    expect(d.join(" ")).toMatch(/Identidad/);
    expect(d.join(" ")).toMatch(/Páginas/);
  });
});
