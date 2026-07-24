import { describe, it, expect } from "vitest";
import { validateContentBlock, type ContentBlock } from "@/lib/content";

describe("content blocks (PBOS ORDEN 6)", () => {
  const blocks: ContentBlock[] = [
    { id: "1", name: "Beneficios", body: "…", status: "borrador", updatedAt: "2026-07-20" },
  ];

  it("requires a name and rejects duplicates case-insensitively", () => {
    expect(validateContentBlock(blocks, { name: "" }).ok).toBe(false);
    expect(validateContentBlock(blocks, { name: "beneficios" }).ok).toBe(false);
    expect(validateContentBlock(blocks, { name: "Envío" }).ok).toBe(true);
  });

  it("allows renaming a block to its own name", () => {
    expect(validateContentBlock(blocks, { id: "1", name: "Beneficios" }).ok).toBe(true);
  });
});
