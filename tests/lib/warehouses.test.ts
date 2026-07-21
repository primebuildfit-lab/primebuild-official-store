import { describe, it, expect } from "vitest";
import {
  validateWarehouse,
  validateLocation,
  locationCycle,
  isNonSellable,
  type Location,
  type Warehouse,
} from "@/lib/warehouses";

const whs: Warehouse[] = [
  { id: "w1", name: "Principal", code: "WH-01", status: "activo", createdAt: "" },
];

const locs: Location[] = [
  {
    id: "a",
    warehouseId: "w1",
    code: "Z-A",
    type: "almacenamiento",
    parentId: null,
    virtual: false,
  },
  { id: "b", warehouseId: "w1", code: "Z-A-01", type: "picking", parentId: "a", virtual: false },
];

describe("warehouses (PBOS ORDEN 12)", () => {
  it("requires a unique warehouse code", () => {
    expect(validateWarehouse(whs, { name: "", code: "X" }).ok).toBe(false);
    expect(validateWarehouse(whs, { name: "Otro", code: "wh-01" }).ok).toBe(false);
    expect(validateWarehouse(whs, { name: "Otro", code: "WH-02" }).ok).toBe(true);
  });

  it("requires unique location codes within a warehouse and existing parents", () => {
    expect(validateLocation(locs, { code: "z-a", parentId: null }).ok).toBe(false);
    expect(validateLocation(locs, { code: "Z-B", parentId: "zzz" }).ok).toBe(false);
    expect(validateLocation(locs, { code: "Z-B", parentId: "a" }).ok).toBe(true);
  });

  it("prevents location hierarchy cycles", () => {
    expect(locationCycle(locs, "a", "b")).toBe(true); // a under its descendant b
    expect(locationCycle(locs, "b", "b")).toBe(true); // self
    expect(locationCycle(locs, "b", null)).toBe(false);
  });

  it("marks quarantine and damaged as non-sellable", () => {
    expect(isNonSellable("cuarentena")).toBe(true);
    expect(isNonSellable("dañados")).toBe(true);
    expect(isNonSellable("almacenamiento")).toBe(false);
  });
});
