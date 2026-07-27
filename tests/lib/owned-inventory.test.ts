import { describe, expect, it } from "vitest";
import type { InventoryMovement } from "@/lib/inventory";
import {
  computeAvailable,
  createReservation,
  deriveOwnedInventory,
  expireReservations,
  fastShippingVerdict,
  isReservationLive,
  publicationState,
  reservedQuantity,
  stockBadges,
  transitionReservation,
  wouldGoNegative,
  type InventoryReservation,
} from "@/lib/owned-inventory";

const NOW = "2026-07-23T12:00:00.000Z";
const LATER = "2026-07-23T13:00:00.000Z";

let seq = 0;
const makeId = () => `id_${++seq}`;

function mov(partial: Partial<InventoryMovement>): InventoryMovement {
  return {
    id: makeId(),
    movementType: "recepcion",
    sku: "SKU-1",
    warehouseId: "alm-1",
    quantity: 10,
    unit: "unidad",
    condition: "ok",
    direction: "in",
    sourceType: "recepcion",
    actor: "test",
    reason: "test",
    occurredAt: NOW,
    recordedAt: NOW,
    status: "publicado",
    version: 1,
    ...partial,
  };
}

function reservation(partial: Partial<InventoryReservation>): InventoryReservation {
  return {
    id: makeId(),
    idempotencyKey: `key_${seq}`,
    items: [{ sku: "SKU-1", warehouseId: "alm-1", quantity: 2 }],
    status: "Active",
    createdAt: NOW,
    expiresAt: LATER,
    sourceType: "checkout",
    actor: "test",
    version: 1,
    ...partial,
  };
}

describe("fórmula de disponibilidad (§8)", () => {
  it("available = onHand − reserved − damaged", () => {
    expect(computeAvailable({ onHand: 10, reserved: 3, damaged: 2 })).toBe(5);
    expect(computeAvailable({ onHand: 2, reserved: 2, damaged: 1 })).toBe(-1);
  });

  it("deriva el contrato desde el ledger: ok=10, dañado=2, reserva 3 ⇒ available 7 (= ok − reservado)", () => {
    const movements = [
      mov({ quantity: 10, condition: "ok" }),
      mov({ quantity: 2, condition: "dañado" }),
    ];
    const items = deriveOwnedInventory(movements, [reservation({ items: [{ sku: "SKU-1", warehouseId: "alm-1", quantity: 3 }] })], NOW);
    expect(items).toHaveLength(1);
    const i = items[0]!;
    expect(i.onHand).toBe(12); // físico total
    expect(i.damaged).toBe(2);
    expect(i.reserved).toBe(3);
    expect(i.available).toBe(7); // 12 − 3 − (2+0) = onHand físico − reservado − dañado
    expect(i.source).toBe("ledger_local");
    expect(i.lastMovementAt).toBe(NOW);
  });

  it("la cuarentena descuenta del disponible como término dañado, pero se muestra aparte", () => {
    const movements = [
      mov({ quantity: 10, condition: "ok" }),
      mov({ quantity: 4, condition: "cuarentena" }),
    ];
    const i = deriveOwnedInventory(movements, [], NOW)[0]!;
    expect(i.onHand).toBe(14);
    expect(i.quarantine).toBe(4);
    expect(i.available).toBe(10);
  });
});

describe("reservas atómicas e idempotentes (§12, §47)", () => {
  it("crea una reserva dentro del disponible", () => {
    const movements = [mov({ quantity: 10 })];
    const r = createReservation(
      { idempotencyKey: "k1", items: [{ sku: "SKU-1", warehouseId: "alm-1", quantity: 4 }], expiresAt: LATER, sourceType: "checkout", actor: "t" },
      { movements, reservations: [], nowIso: NOW, makeId },
    );
    expect(r.ok).toBe(true);
  });

  it("previene la sobreventa contando reservas vivas (§66 sin reservas duplicadas)", () => {
    const movements = [mov({ quantity: 10 })];
    const first = createReservation(
      { idempotencyKey: "k1", items: [{ sku: "SKU-1", warehouseId: "alm-1", quantity: 7 }], expiresAt: LATER, sourceType: "checkout", actor: "t" },
      { movements, reservations: [], nowIso: NOW, makeId },
    );
    expect(first.ok).toBe(true);
    const existing = first.ok ? [first.reservation] : [];
    const second = createReservation(
      { idempotencyKey: "k2", items: [{ sku: "SKU-1", warehouseId: "alm-1", quantity: 4 }], expiresAt: LATER, sourceType: "checkout", actor: "t" },
      { movements, reservations: existing, nowIso: NOW, makeId },
    );
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe("OVERSELL_PREVENTED");
  });

  it("es idempotente por clave: la misma clave devuelve la misma reserva", () => {
    const movements = [mov({ quantity: 10 })];
    const a = createReservation(
      { idempotencyKey: "same", items: [{ sku: "SKU-1", warehouseId: "alm-1", quantity: 2 }], expiresAt: LATER, sourceType: "checkout", actor: "t" },
      { movements, reservations: [], nowIso: NOW, makeId },
    );
    const list = a.ok ? [a.reservation] : [];
    const b = createReservation(
      { idempotencyKey: "same", items: [{ sku: "SKU-1", warehouseId: "alm-1", quantity: 9 }], expiresAt: LATER, sourceType: "checkout", actor: "t" },
      { movements, reservations: list, nowIso: NOW, makeId },
    );
    expect(b.ok).toBe(true);
    if (b.ok && a.ok) {
      expect(b.reservation.id).toBe(a.reservation.id);
      expect(b.idempotentReplay).toBe(true);
    }
  });

  it("rechaza cantidades no enteras o no positivas", () => {
    const movements = [mov({ quantity: 10 })];
    for (const q of [0, -1, 1.5]) {
      const r = createReservation(
        { idempotencyKey: `k${q}`, items: [{ sku: "SKU-1", warehouseId: "alm-1", quantity: q }], expiresAt: LATER, sourceType: "checkout", actor: "t" },
        { movements, reservations: [], nowIso: NOW, makeId },
      );
      expect(r.ok).toBe(false);
    }
  });

  it("las reservas caducan y dejan de descontar", () => {
    const r = reservation({ expiresAt: "2026-07-23T12:30:00.000Z" });
    expect(isReservationLive(r, NOW)).toBe(true);
    expect(isReservationLive(r, "2026-07-23T12:31:00.000Z")).toBe(false);
    const { updated, expiredIds } = expireReservations([r], "2026-07-23T12:31:00.000Z");
    expect(expiredIds).toContain(r.id);
    expect(updated[0]!.status).toBe("Expired");
    expect(reservedQuantity(updated, "SKU-1", "alm-1", "2026-07-23T12:31:00.000Z")).toBe(0);
  });

  it("transiciones legales: no se convierte una reserva vencida", () => {
    const r = reservation({ expiresAt: "2026-07-23T11:00:00.000Z" }); // ya vencida a NOW
    expect(transitionReservation(r, "Converted", NOW)).toBeNull();
    const live = reservation({});
    expect(transitionReservation(live, "Converted", NOW)?.status).toBe("Converted");
    const converted = transitionReservation(live, "Converted", NOW)!;
    expect(transitionReservation(converted, "Released", NOW)).toBeNull();
  });
});

describe("visibilidad pública (§10)", () => {
  it("visible SOLO con available>0 + elegible + OWNED_STOCK", () => {
    expect(
      publicationState({ available: 3, officialStoreEligible: true, inventoryClassification: "OWNED_STOCK" }),
    ).toBe("visible");
    expect(
      publicationState({ available: 0, officialStoreEligible: true, inventoryClassification: "OWNED_STOCK" }),
    ).toBe("hidden_out_of_stock");
    expect(
      publicationState({ available: 5, officialStoreEligible: false, inventoryClassification: "OWNED_STOCK" }),
    ).toBe("hidden_not_eligible");
    expect(
      publicationState({ available: 5, officialStoreEligible: true, inventoryClassification: "SUPPLIER_STOCK_OBSERVED" }),
    ).toBe("hidden_not_owned_stock");
  });
});

describe("etiquetas de stock en vivo (§11)", () => {
  it("estado con fuente y timestamp; low_stock por punto de reorden", () => {
    const movements = [mov({ quantity: 3 })];
    const items = deriveOwnedInventory(movements, [], NOW, {
      reorder: { "SKU-1": { reorderPoint: 5 } },
    });
    const b = stockBadges(items[0]!);
    expect(b.primary).toBe("low_stock");
    expect(b.source).toBe("ledger_local");
    expect(b.asOf).toBe(NOW);
  });
});

describe("stock nunca negativo (§66)", () => {
  it("rechaza salidas que dejarían el saldo bajo cero", () => {
    const movements = [mov({ quantity: 5 })];
    expect(
      wouldGoNegative(movements, { sku: "SKU-1", warehouseId: "alm-1", quantity: 6, direction: "out", condition: "ok" }),
    ).toBe(true);
    expect(
      wouldGoNegative(movements, { sku: "SKU-1", warehouseId: "alm-1", quantity: 5, direction: "out", condition: "ok" }),
    ).toBe(false);
    expect(
      wouldGoNegative(movements, { sku: "SKU-X", warehouseId: "alm-1", quantity: 1, direction: "out", condition: "ok" }),
    ).toBe(true);
  });
});

describe("envío rápido veraz (§14)", () => {
  it("solo promete con TODAS las condiciones verdaderas", () => {
    const all = {
      stockConfirmed: true,
      warehouseAssigned: true,
      carrierServiceAvailable: true,
      cutoffDefined: true,
      destinationEligible: true,
      slaRegistered: true,
    };
    expect(fastShippingVerdict(all).eligible).toBe(true);
    for (const k of Object.keys(all) as (keyof typeof all)[]) {
      const v = fastShippingVerdict({ ...all, [k]: false });
      expect(v.eligible).toBe(false);
      expect(v.missing.length).toBe(1);
    }
  });
});
