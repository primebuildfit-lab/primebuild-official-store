import { describe, it, expect } from "vitest";
import {
  draftSubtotal,
  draftTotal,
  isExpired,
  effectiveStatus,
  validateDraft,
  draftToOrderProjection,
  type SalesDraft,
  type DraftLine,
} from "@/lib/drafts";

const line = (p: Partial<DraftLine>): DraftLine => ({
  id: p.id ?? "l",
  sku: p.sku ?? "A",
  qty: p.qty ?? 1,
  unit: p.unit ?? "unidad",
  unitPrice: p.unitPrice ?? null,
});

const draft = (over: Partial<SalesDraft>): SalesDraft => ({
  id: "d1abcdef",
  kind: "cotizacion",
  customerRef: "Ana ****",
  lines: over.lines ?? [line({ sku: "A", qty: 2, unitPrice: 10 })],
  currency: over.currency ?? "USD",
  discount: over.discount ?? null,
  status: over.status ?? "abierto",
  validUntil: over.validUntil ?? null,
  responsible: null,
  actor: "op",
  reason: null,
  source: "local",
  version: 1,
  history: [],
  createdAt: "2026-07-20T00:00:00Z",
  updatedAt: "2026-07-20T00:00:00Z",
});

describe("drafts & quotes (corrective)", () => {
  it("subtotals known prices and counts unknown ones (never 0 for unknown)", () => {
    const s = draftSubtotal([line({ qty: 2, unitPrice: 10 }), line({ qty: 3, unitPrice: null })]);
    expect(s.subtotal).toBe(20);
    expect(s.linesWithoutPrice).toBe(1);
  });

  it("total applies a discount only when configured", () => {
    expect(draftTotal({ lines: [line({ qty: 2, unitPrice: 10 })], discount: null }).total).toBe(20);
    expect(draftTotal({ lines: [line({ qty: 2, unitPrice: 10 })], discount: 5 }).total).toBe(15);
  });

  it("requires a valid ISO currency (no mixing / no unknown)", () => {
    expect(validateDraft({ currency: null, lines: [] }).ok).toBe(false);
    expect(validateDraft({ currency: "US", lines: [] }).ok).toBe(false);
    expect(validateDraft({ currency: "USD", lines: [] }).ok).toBe(true);
  });

  it("computes expiry without mutating; converted/cancelled never expire", () => {
    const past = draft({ validUntil: "2000-01-01T00:00:00Z", status: "abierto" });
    expect(isExpired(past)).toBe(true);
    expect(effectiveStatus(past)).toBe("expirado");
    expect(isExpired(draft({ validUntil: "2000-01-01T00:00:00Z", status: "convertido" }))).toBe(
      false,
    );
  });

  it("converts to a LOCAL order projection with traceability, never a Shopify order", () => {
    const p = draftToOrderProjection(
      draft({ lines: [line({ qty: 2, unitPrice: 10 })] }),
      "t",
      () => "ord1",
    );
    expect(p.source).toBe("manual");
    expect(p.externalId).toBe("draft:d1abcdef");
    expect(p.correlationId).toBe("draft:d1abcdef");
    expect(p.reservationStatus).toBe("sin-reservar");
    expect(p.totalObserved).toBe("20");
  });
});
