import { describe, it, expect, beforeEach } from "vitest";
import { readVersioned, writeVersioned } from "@/lib/local-collection";

interface Row {
  id: string;
  n: number;
}
const isRow = (x: unknown): x is Row =>
  x !== null &&
  typeof x === "object" &&
  typeof (x as Row).id === "string" &&
  typeof (x as Row).n === "number";

const KEY = "test:rows";
const raw = (key: string) => window.localStorage.getItem(`pbos:local:${key}`);

describe("versioned local store (PBOS ORDEN 11 persistence)", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips items inside a versioned, scoped envelope", () => {
    writeVersioned(KEY, 2, [{ id: "a", n: 1 }]);
    const stored = JSON.parse(raw(KEY)!);
    expect(stored.scope).toBe("local");
    expect(stored.v).toBe(2);
    expect(typeof stored.updatedAt).toBe("string");
    const r = readVersioned(KEY, 2, isRow);
    expect(r.items).toEqual([{ id: "a", n: 1 }]);
    expect(r.storedVersion).toBe(2);
  });

  it("degrades safely on corrupt data and drops invalid rows, keeping valid ones", () => {
    window.localStorage.setItem(`pbos:local:${KEY}`, "{not json");
    expect(readVersioned(KEY, 1, isRow).items).toEqual([]);

    writeVersioned(KEY, 1, [{ id: "a", n: 1 }] as Row[]);
    // Corrupt one row by writing a mixed envelope manually.
    window.localStorage.setItem(
      `pbos:local:${KEY}`,
      JSON.stringify({
        scope: "local",
        v: 1,
        updatedAt: "x",
        items: [{ id: "a", n: 1 }, { id: "b" }, 42],
      }),
    );
    const r = readVersioned(KEY, 1, isRow);
    expect(r.items).toEqual([{ id: "a", n: 1 }]); // invalid rows dropped
  });

  it("reads a legacy bare array (v=0) and preserves valid items across a schema bump", () => {
    window.localStorage.setItem(`pbos:local:${KEY}`, JSON.stringify([{ id: "a", n: 1 }]));
    const r = readVersioned(KEY, 3, isRow);
    expect(r.items).toEqual([{ id: "a", n: 1 }]);
    expect(r.storedVersion).toBe(0);
  });
});
