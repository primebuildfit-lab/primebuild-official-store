import { describe, it, expect } from "vitest";
import {
  validateOperatorSettings,
  diffSettings,
  PENDING_DECISIONS,
  type OperatorSettings,
} from "@/lib/settings";

describe("settings (PBOS ORDEN 28)", () => {
  it("validates the operator label", () => {
    expect(validateOperatorSettings({ displayLabel: "" }).ok).toBe(false);
    expect(validateOperatorSettings({ displayLabel: "x".repeat(61) }).ok).toBe(false);
    expect(validateOperatorSettings({ displayLabel: "Comercio PB" }).ok).toBe(true);
  });

  it("produces a readable diff for revisions", () => {
    const a: OperatorSettings = { id: "s", displayLabel: "A", timezoneLabel: "UTC", updatedAt: "" };
    const b: OperatorSettings = { id: "s", displayLabel: "B", timezoneLabel: "UTC", updatedAt: "" };
    expect(diffSettings(null, a)).toContain("(creación inicial)");
    expect(diffSettings(a, b)[0]).toMatch(/etiqueta/);
    expect(diffSettings(a, a)).toContain("(sin cambios)");
  });

  it("lists business decisions as pending, never invents them", () => {
    const names = PENDING_DECISIONS.map((d) => d.name);
    expect(names).toContain("Moneda base");
    expect(names).toContain("Fórmula de disponibilidad");
    expect(names).toContain("Política de reserva");
  });
});
