import { describe, it, expect } from "vitest";
import {
  canTransferTransition,
  validateTransfer,
  withinAvailable,
  buildDispatchMovements,
  buildReceiveMovements,
  type Transfer,
} from "@/lib/transfers";
import { deriveBalances } from "@/lib/inventory";

let c = 0;
const id = () => `m${++c}`;

const transfer: Transfer = {
  id: "t1",
  code: "TR-0001",
  originCode: "WH-01",
  destCode: "WH-02",
  status: "preparando",
  lines: [{ id: "l1", sku: "A", qty: 10, unit: "unidad", received: 0 }],
  history: [],
  version: 1,
};

describe("transfers (PBOS ORDEN 13)", () => {
  it("forbids skipping states and dispatch/receive are distinct steps", () => {
    expect(canTransferTransition("borrador", "pendiente")).toBe(true);
    expect(canTransferTransition("preparando", "en-transito")).toBe(true);
    expect(canTransferTransition("preparando", "recibida")).toBe(false);
    expect(canTransferTransition("borrador", "en-transito")).toBe(false);
  });

  it("rejects equal origin/destination and empty lines", () => {
    expect(validateTransfer({ originCode: "A", destCode: "A", lines: transfer.lines }).ok).toBe(
      false,
    );
    expect(validateTransfer({ originCode: "A", destCode: "B", lines: [] }).ok).toBe(false);
    expect(validateTransfer({ originCode: "A", destCode: "B", lines: transfer.lines }).ok).toBe(
      true,
    );
  });

  it("checks availability at origin", () => {
    expect(withinAvailable(10, 10)).toBe(true);
    expect(withinAvailable(4, 10)).toBe(false);
  });

  it("dispatch removes from origin; receipt adds to destination; not double-counted", () => {
    const out = buildDispatchMovements(transfer, "op", [], "t", id);
    expect(out).toHaveLength(1);
    expect(out[0]!.direction).toBe("out");
    expect(out[0]!.warehouseId).toBe("WH-01");
    // Re-dispatch is idempotent.
    expect(buildDispatchMovements(transfer, "op", out, "t", id)).toHaveLength(0);

    // Partial receive of 6 at destination.
    const inMov = buildReceiveMovements(transfer, { l1: 6 }, "op", "e1", "t", id);
    expect(inMov[0]!.direction).toBe("in");
    expect(inMov[0]!.warehouseId).toBe("WH-02");

    const balances = deriveBalances([...out, ...inMov]);
    const origin = balances.find((b) => b.warehouseId === "WH-01")!;
    const dest = balances.find((b) => b.warehouseId === "WH-02")!;
    expect(origin.onHand).toBe(-10); // 10 left origin (net from these movements only)
    expect(dest.onHand).toBe(6); // 6 arrived; 4 still in transit
  });
});
