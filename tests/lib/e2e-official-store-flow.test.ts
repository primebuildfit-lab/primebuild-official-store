import { describe, expect, it } from "vitest";
import type { InventoryMovement } from "@/lib/inventory";
import { INVENTORY_SCHEMA_VERSION } from "@/lib/inventory";
import type { ShopifyCatalogMirrorRecord } from "@/lib/catalog-mirror";
import { importProductFromMirror } from "@/lib/official-products";
import {
  createReservation,
  deriveOwnedInventory,
  publicationState,
  transitionReservation,
  wouldGoNegative,
  type InventoryReservation,
} from "@/lib/owned-inventory";
import { computeVariantPrice } from "@/lib/store-pricing";
import {
  createOrderDraft,
  orderTotals,
  transitionOrder,
  validateCartQuantities,
  type CartLine,
} from "@/lib/storefront";

/**
 * E2E del flujo completo de la Official Store (PBOS-DPB-MEGA-FABLE-001 §82
 * fase 60 — verificación de runtime): espejo Shopify (datos REALES del
 * catálogo primebuildfit descubierto en esta orden) → import de plantilla →
 * recepción al ledger → visibilidad → precio PB → carrito → reserva →
 * pedido → pago observado → envío (salida del ledger) → producto se oculta
 * al agotarse. Cada paso usa exclusivamente los módulos de producción.
 */

const NOW = "2026-07-23T20:00:00.000Z";
let seq = 0;
const makeId = () => `e2e_${++seq}`;

// Registro espejo con la forma REAL del producto vivo de Shopify
// «PrimeBuild™ Adjustable Weight Lifting Belt» (gid .../8459691491536).
const BELT_MIRROR: ShopifyCatalogMirrorRecord = {
  id: "mirror_8459691491536",
  shopifyProductId: "gid://shopify/Product/8459691491536",
  handle: "primebuild-weight-lifting-belt",
  title: "PrimeBuild™ Adjustable Weight Lifting Belt – Core Support for Heavy Training",
  descriptionHtml: "<p>Build strength with confidence…</p>",
  vendor: "PrimeBuild",
  productType: "strength",
  tags: ["core", "essential", "strength"],
  collections: ["strength-training-essentials-1", "core-strength-stability"],
  mediaUrls: ["https://cdn.shopify.com/s/files/1/0670/7737/4160/files/6550b82443958f2880b096215e95bb09.jpg"],
  options: [
    { name: "Color", values: ["Blue", "Black"] },
    { name: "Size", values: ["L", "Xl"] },
  ],
  variants: [
    { shopifyVariantId: "gid://shopify/ProductVariant/45028623679696", title: "Blue / L", sku: "BELT-BLUE-L", priceUsd: "24.99", options: { Color: "Blue", Size: "L" }, observedSupplierStock: 10 },
    { shopifyVariantId: "gid://shopify/ProductVariant/45028623712464", title: "Black / Xl", sku: "BELT-BLACK-XL", priceUsd: "24.99", options: { Color: "Black", Size: "Xl" }, observedSupplierStock: 10 },
  ],
  status: "ACTIVE",
  source: "shopify_admin_api",
  fetchedAt: NOW,
  modes: ["TEMPLATE_ONLY", "CATALOG_METADATA", "MEDIA", "VARIANT_MAPPING", "OBSERVED_SUPPLIER_STOCK"],
  version: 1,
};

describe("E2E Official Store: espejo → plantilla → stock → tienda → pedido → envío", () => {
  it("recorre el ciclo completo con los módulos de producción", () => {
    // 1. Import de plantilla desde el espejo (nace sin stock, no elegible).
    const template = importProductFromMirror(BELT_MIRROR, NOW, makeId);
    expect(template.status).toBe("template");
    expect(template.officialStoreEligible).toBe(false);
    expect(JSON.stringify(template)).not.toContain("observedSupplierStock");

    // 2. El operador decide elegibilidad (decisión explícita, no implícita).
    const product = { ...template, officialStoreEligible: true, status: "ready" as const };

    // 3. Sin recepción: oculto (supplier stock ≠ owned stock).
    let movements: InventoryMovement[] = [];
    let reservations: InventoryReservation[] = [];
    let inventory = deriveOwnedInventory(movements, reservations, NOW);
    expect(inventory).toHaveLength(0);
    expect(
      publicationState({ available: 0, officialStoreEligible: true, inventoryClassification: "OWNED_STOCK" }),
    ).toBe("hidden_out_of_stock");

    // 4. Recepción explícita: 6 unidades del SKU BELT-BLUE-L al almacén alm-1.
    movements = [
      {
        id: makeId(),
        movementType: "recepcion",
        sku: "BELT-BLUE-L",
        productId: product.id,
        warehouseId: "alm-1",
        quantity: 6,
        unit: "unidad",
        condition: "ok",
        direction: "in",
        sourceType: "recepcion",
        sourceId: "rcpt-e2e-1",
        correlationId: "rcpt-e2e-1",
        actor: "e2e",
        reason: "Recepción de verificación PBOS-DPB-MEGA-FABLE-001",
        occurredAt: NOW,
        recordedAt: NOW,
        status: "publicado",
        version: INVENTORY_SCHEMA_VERSION,
      },
    ];
    inventory = deriveOwnedInventory(movements, reservations, NOW);
    expect(inventory[0]!.available).toBe(6);
    expect(inventory[0]!.source).toBe("ledger_local");

    // 5. Ahora sí visible (§10).
    expect(
      publicationState({ available: 6, officialStoreEligible: true, inventoryClassification: "OWNED_STOCK" }),
    ).toBe("visible");

    // 6. Precio PB: VA 24.99 (fuente Shopify) → VN 22.49 → PB por quote.
    const variant = product.variants.find((v) => v.sku === "BELT-BLUE-L")!;
    const price = computeVariantPrice(product, variant, NOW, makeId);
    expect(price.ok).toBe(true);
    if (!price.ok) return;
    expect(price.quote.snapshot.vaUsd).toBe("24.99");
    expect(price.quote.snapshot.vnUsd).toBe("22.49"); // 24.99 × 0.9 = 22.491 → 22.49
    expect(parseFloat(price.quote.snapshot.pbDisplay)).toBeCloseTo(22.49 * 3.14159, 1);

    // 7. Carrito con 4 unidades (≤ disponible) validado.
    const line: CartLine = {
      id: makeId(),
      productId: product.id,
      variantId: variant.id,
      title: product.title,
      variantTitle: variant.title,
      sku: variant.sku,
      warehouseId: "alm-1",
      quantity: 4,
      priceQuote: price.quote,
      addedAt: NOW,
    };
    const availability = (key: string, wh: string) =>
      deriveOwnedInventory(movements, reservations, NOW)
        .filter((i) => i.inventoryItemId === `${key}|||${wh}`)
        .reduce((a, i) => a + Math.max(0, i.available), 0);
    expect(validateCartQuantities([line], availability)).toHaveLength(0);

    // 8. Checkout: reserva atómica idempotente de las 4 unidades.
    const res = createReservation(
      {
        idempotencyKey: "checkout:e2e-1",
        items: [{ sku: "BELT-BLUE-L", productId: product.id, warehouseId: "alm-1", quantity: 4 }],
        expiresAt: "2026-07-23T20:30:00.000Z",
        sourceType: "checkout",
        sourceId: "e2e-1",
        actor: "storefront",
      },
      { movements, reservations, nowIso: NOW, makeId },
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    reservations = [res.reservation];

    // 8b. El disponible cae a 2 y un segundo comprador no puede sobrevender.
    inventory = deriveOwnedInventory(movements, reservations, NOW);
    expect(inventory[0]!.available).toBe(2);
    const oversell = createReservation(
      {
        idempotencyKey: "checkout:e2e-2",
        items: [{ sku: "BELT-BLUE-L", productId: product.id, warehouseId: "alm-1", quantity: 3 }],
        expiresAt: "2026-07-23T20:30:00.000Z",
        sourceType: "checkout",
        actor: "storefront",
      },
      { movements, reservations, nowIso: NOW, makeId },
    );
    expect(oversell.ok).toBe(false);

    // 9. Pedido Draft → Awaiting payment; la reserva se extiende.
    let order = createOrderDraft(
      {
        items: [{ id: makeId(), productId: product.id, variantId: variant.id, title: product.title, variantTitle: variant.title, sku: variant.sku, warehouseId: "alm-1", quantity: 4, priceQuote: price.quote }],
        reservationId: res.reservation.id,
        paymentChoice: "PB",
        address: { name: "E2E", line1: "Calle 1", city: "MX", country: "MX", postal: "00000" },
      },
      NOW,
      makeId,
    );
    const t1 = transitionOrder(order, "Awaiting payment", "storefront", NOW);
    expect(t1.ok).toBe(true);
    if (!t1.ok) return;
    order = t1.order;
    const extended = transitionReservation(res.reservation, "Extended", NOW, "2026-07-30T20:00:00.000Z");
    expect(extended).not.toBeNull();
    reservations = [extended!];

    // 10. Totales desde snapshots (nunca recalculados): 4 × 22.49 = 89.96 USD.
    const totals = orderTotals(order.items);
    expect(totals.vnTotalUsd).toBe("89.96");
    expect(totals.savingsUsd).toBe("10.00"); // 4 × 2.50

    // 11. Pago: imposible sin evidencia; con referencia observada avanza.
    expect(transitionOrder(order, "Paid observed", "admin", NOW).ok).toBe(false);
    const paid = transitionOrder(order, "Paid observed", "admin", NOW, { reference: "obs-e2e-777", observedAt: NOW, method: "PB" });
    expect(paid.ok).toBe(true);
    if (!paid.ok) return;
    order = paid.order;

    // 12. Picking → Packed → Shipped: la salida del ledger es idempotente.
    for (const s of ["Picking", "Packed", "Shipped"] as const) {
      const t = transitionOrder(order, s, "admin", NOW);
      expect(t.ok).toBe(true);
      if (t.ok) order = t.order;
    }
    const outMovement: InventoryMovement = {
      id: makeId(),
      movementType: "ajuste-negativo",
      sku: "BELT-BLUE-L",
      productId: product.id,
      warehouseId: "alm-1",
      quantity: 4,
      unit: "unidad",
      condition: "ok",
      direction: "out",
      sourceType: "pedido-official-store",
      sourceId: order.id,
      correlationId: order.id,
      actor: "admin",
      reason: `Envío del pedido ${order.id}`,
      occurredAt: NOW,
      recordedAt: NOW,
      status: "publicado",
      version: INVENTORY_SCHEMA_VERSION,
    };
    expect(wouldGoNegative(movements, outMovement)).toBe(false);
    movements = [...movements, outMovement];
    const converted = transitionReservation(reservations[0]!, "Converted", NOW);
    expect(converted).not.toBeNull();
    reservations = [converted!];

    // 13. Estado final: quedan 2 disponibles (6 − 4), reserva convertida.
    inventory = deriveOwnedInventory(movements, reservations, NOW);
    expect(inventory[0]!.onHand).toBe(2);
    expect(inventory[0]!.reserved).toBe(0); // convertida: ya no descuenta
    expect(inventory[0]!.available).toBe(2);

    // 14. Si se vendieran las 2 restantes, el producto se OCULTA del público.
    expect(
      publicationState({ available: 0, officialStoreEligible: true, inventoryClassification: "OWNED_STOCK" }),
    ).toBe("hidden_out_of_stock");
  });
});
