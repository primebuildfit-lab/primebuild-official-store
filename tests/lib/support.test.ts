import { describe, it, expect } from "vitest";
import { validateTicket, safeDiagnostic, SUPPORT_LINKS } from "@/lib/support";

describe("support (PBOS ORDEN 29)", () => {
  it("validates a ticket draft", () => {
    expect(validateTicket({ subject: "", description: "x" }).ok).toBe(false);
    expect(validateTicket({ subject: "x", description: "" }).ok).toBe(false);
    expect(validateTicket({ subject: "Fallo", description: "detalle" }).ok).toBe(true);
  });

  it("safe diagnostic excludes secrets and personal data", () => {
    const d = safeDiagnostic("0.1.0");
    expect(d.included.some((x) => x.includes("0.1.0"))).toBe(true);
    expect(d.excluded).toContain("tokens y secretos");
    expect(d.excluded).toContain("datos personales de clientes");
  });

  it("contextual links point to real routes", () => {
    for (const l of SUPPORT_LINKS) expect(l.href.startsWith("/")).toBe(true);
    expect(SUPPORT_LINKS.some((l) => l.href === "/purchasing/quick-buy")).toBe(true);
  });
});
