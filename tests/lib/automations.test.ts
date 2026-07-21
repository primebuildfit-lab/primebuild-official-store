import { describe, it, expect } from "vitest";
import { isProtectedAction, testRule, PROTECTED_ACTIONS, type Rule } from "@/lib/automations";

const rule = (over: Partial<Rule>): Rule => ({
  id: "r1",
  name: "Stock bajo → tarea",
  status: "activa",
  trigger: "stock-bajo",
  conditions: over.conditions ?? ["bajo"],
  actions: over.actions ?? ["crear-tarea"],
  scope: "inventario",
  environment: "local",
  owner: "operador-local",
  version: 1,
  history: [],
  ...over,
});

describe("automations (PBOS ORDEN 26)", () => {
  it("classifies protected actions", () => {
    expect(isProtectedAction("reembolsar")).toBe(true);
    expect(isProtectedAction("enviar-orden-compra")).toBe(true);
    expect(isProtectedAction("crear-tarea")).toBe(false);
    expect(PROTECTED_ACTIONS).toContain("publicar");
  });

  it("test mode evaluates conditions and never executes; protected actions are blocked", () => {
    const r = rule({
      conditions: ["bajo", "sinProveedor"],
      actions: ["crear-tarea", "enviar-orden-compra"],
    });
    const res = testRule(r, { bajo: true });
    expect(res.executed).toBe(false);
    expect(res.conditionsEvaluated.find((c) => c.condition === "bajo")!.met).toBe(true);
    expect(res.missing).toContain("sinProveedor");
    expect(res.proposedActions).toEqual(["crear-tarea"]);
    expect(res.blockedActions).toEqual(["enviar-orden-compra"]);
  });
});
