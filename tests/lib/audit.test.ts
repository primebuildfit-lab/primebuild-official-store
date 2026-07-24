import { describe, it, expect } from "vitest";
import { maskSensitive, canExportAudit, toAuditEvent } from "@/lib/audit";

describe("audit (PBOS ORDEN 27)", () => {
  it("masks secrets and personal data", () => {
    expect(maskSensitive("token shpat_ABC123 leaked")).toMatch(/«oculto»/);
    expect(maskSensitive("password=hunter2")).toMatch(/«oculto»/);
    expect(maskSensitive("wrote ana@example.com")).toMatch(/a\*\*\*@example\.com/);
    expect(maskSensitive("nada sensible")).toBe("nada sensible");
  });

  it("gates export behind a capability", () => {
    expect(canExportAudit(false).ok).toBe(false);
    expect(canExportAudit(true).ok).toBe(true);
  });

  it("normalizes an event and masks its text", () => {
    const ev = toAuditEvent({
      id: "1",
      at: "2026-07-20",
      actor: "op",
      action: "set token shpat_XYZ",
      entity: "OC-1",
      category: "compras",
      source: "oc",
      reason: "contacto ana@example.com",
    });
    expect(ev.action).toMatch(/«oculto»/);
    expect(ev.reason).toMatch(/a\*\*\*@example\.com/);
    expect(ev.result).toBe("ok");
  });
});
