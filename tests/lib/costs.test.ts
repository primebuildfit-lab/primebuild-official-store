import { describe, it, expect } from "vitest";
import { computeLandedCost, computeMargin, costVariation } from "@/lib/costs";

describe("costs & margins (PBOS ORDEN 23)", () => {
  it("landed cost is 'estimado' while components are missing, 'no-medido' without purchase", () => {
    expect(computeLandedCost({ currency: "USD", purchase: null }).state).toBe("no-medido");
    const partial = computeLandedCost({ currency: "USD", purchase: 10 });
    expect(partial.state).toBe("estimado"); // freight etc. missing
    expect(partial.value).toBe(10);
    const full = computeLandedCost({
      currency: "USD",
      purchase: 10,
      freight: 2,
      insurance: 1,
      duties: 1,
      nonRecoverableTaxes: 1,
      receiving: 1,
      handling: 1,
      other: 1,
    });
    expect(full.state).toBe("calculado");
    expect(full.value).toBe(18);
  });

  it("margin is null (never 0) when data is missing or currencies differ", () => {
    const landed = computeLandedCost({ currency: "USD", purchase: 10 });
    expect(computeMargin(null, "USD", landed).value).toBeNull();
    expect(computeMargin(20, "EUR", landed).state).toBe("fuente-incompleta"); // currency mismatch
    const ok = computeMargin(20, "USD", landed);
    expect(ok.value).toBe(10);
    expect(ok.pct).toBeCloseTo(0.5);
  });

  it("computes cost variation only within the same currency", () => {
    expect(
      costVariation([
        { at: "2026-07-01", value: 8, currency: "USD" },
        { at: "2026-07-10", value: 10, currency: "USD" },
      ]),
    ).toEqual({ last: 10, previous: 8, delta: 2, currency: "USD" });
    expect(
      costVariation([
        { at: "2026-07-01", value: 8, currency: "USD" },
        { at: "2026-07-10", value: 10, currency: "EUR" },
      ]),
    ).toBeNull();
    expect(costVariation([{ at: "x", value: 8, currency: "USD" }])).toBeNull();
  });
});
