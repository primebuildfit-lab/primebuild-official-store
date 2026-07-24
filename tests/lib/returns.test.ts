import { describe, it, expect } from "vitest";
import {
  canReturnTransition,
  inspectionComplete,
  destinationCondition,
  buildReturnMovements,
  type SalesReturn,
} from "@/lib/returns";
import { deriveBalances } from "@/lib/inventory";

let c = 0;
const id = () => `m${++c}`;

const ret = (over: Partial<SalesReturn>): SalesReturn => ({
  id: "r1",
  code: "DEV-0001",
  orderId: "o1",
  orderExternalId: "gid://shopify/Order/1",
  source: "shopify",
  reason: "defectuoso",
  lines: [
    {
      id: "l",
      sku: "A",
      qty: 3,
      unit: "unidad",
      inspected: true,
      destination: "reintegrar-disponible",
    },
  ],
  status: "en-revision",
  refund: {},
  warehouse: "WH-01",
  actor: "op",
  createdAt: "",
  history: [],
  posted: false,
  version: 1,
  ...over,
});

describe("returns (PBOS ORDEN 21)", () => {
  it("separates the physical flow into non-skippable states", () => {
    expect(canReturnTransition("solicitada", "autorizada")).toBe(false); // needs authorization step
    expect(canReturnTransition("recibida", "pendiente-inspeccion")).toBe(true);
    expect(canReturnTransition("cerrada", "solicitada")).toBe(false);
  });

  it("maps destinations to stock condition; non-stock destinations produce none", () => {
    expect(destinationCondition("reintegrar-disponible")).toBe("ok");
    expect(destinationCondition("cuarentena")).toBe("cuarentena");
    expect(destinationCondition("dañado")).toBe("dañado");
    expect(destinationCondition("devolver-proveedor")).toBeNull();
    expect(destinationCondition("desechar")).toBeNull();
  });

  it("does not post movements before inspection is complete", () => {
    const notInspected = ret({
      lines: [
        {
          id: "l",
          sku: "A",
          qty: 3,
          unit: "unidad",
          inspected: false,
          destination: "reintegrar-disponible",
        },
      ],
    });
    expect(inspectionComplete(notInspected)).toBe(false);
    expect(buildReturnMovements(notInspected, "op", [], "t", id)).toHaveLength(0);
  });

  it("posts append-only movements after inspection, idempotently; damaged never available", () => {
    const r = ret({
      lines: [
        {
          id: "l1",
          sku: "A",
          qty: 2,
          unit: "unidad",
          inspected: true,
          destination: "reintegrar-disponible",
        },
        { id: "l2", sku: "B", qty: 1, unit: "unidad", inspected: true, destination: "dañado" },
        {
          id: "l3",
          sku: "C",
          qty: 5,
          unit: "unidad",
          inspected: true,
          destination: "devolver-proveedor",
        },
      ],
    });
    const first = buildReturnMovements(r, "op", [], "t", id);
    expect(first).toHaveLength(2); // devolver-proveedor produces no stock
    expect(buildReturnMovements(r, "op", first, "t", id)).toHaveLength(0); // idempotent

    const balances = deriveBalances(first);
    const a = balances.find((b) => b.key === "A")!;
    const bDam = balances.find((b) => b.key === "B")!;
    expect(a.onHand).toBe(2);
    expect(bDam.onHand).toBe(0); // damaged never available
    expect(bDam.damaged).toBe(1);
  });
});
