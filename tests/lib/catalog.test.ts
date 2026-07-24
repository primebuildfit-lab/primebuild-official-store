import { describe, it, expect } from "vitest";
import {
  isDuplicateName,
  wouldCreateCycle,
  validateCategory,
  type InternalCategory,
} from "@/lib/catalog";

const cats: InternalCategory[] = [
  { id: "a", name: "Suplementos", parentId: null, status: "activa" },
  { id: "b", name: "Proteínas", parentId: "a", status: "activa" },
  { id: "c", name: "Whey", parentId: "b", status: "activa" },
];

describe("catalog validation (PBOS ORDEN 4)", () => {
  it("detects duplicate names case-insensitively", () => {
    expect(isDuplicateName(["Suplementos"], "suplementos")).toBe(true);
    expect(isDuplicateName(["Suplementos"], "  SUPLEMENTOS  ")).toBe(true);
    expect(isDuplicateName(["Suplementos"], "Accesorios")).toBe(false);
  });

  it("detects hierarchy cycles", () => {
    // Making "a" a child of its descendant "c" would cycle.
    expect(wouldCreateCycle(cats, "a", "c")).toBe(true);
    // Self-parenting is a cycle.
    expect(wouldCreateCycle(cats, "b", "b")).toBe(true);
    // A valid new parent is fine.
    expect(wouldCreateCycle(cats, "c", "a")).toBe(false);
    // No parent is fine.
    expect(wouldCreateCycle(cats, "c", null)).toBe(false);
  });

  it("validates new categories: name required, unique, existing parent", () => {
    expect(validateCategory(cats, { name: "", parentId: null }).ok).toBe(false);
    expect(validateCategory(cats, { name: "Proteínas", parentId: null }).ok).toBe(false);
    expect(validateCategory(cats, { name: "Accesorios", parentId: "zzz" }).ok).toBe(false);
    expect(validateCategory(cats, { name: "Accesorios", parentId: "a" }).ok).toBe(true);
  });

  it("rejects a re-parent that would create a cycle", () => {
    const res = validateCategory(cats, { id: "a", name: "Suplementos", parentId: "c" });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/ciclo/);
  });
});
