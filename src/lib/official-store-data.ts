/**
 * Datos locales de la Official Store (PBOS-DPB-MEGA-FABLE-001).
 *
 * Punto único de acceso a las colecciones locales del inventario propio, el
 * espejo Shopify, el catálogo oficial, las reservas, el carrito y los pedidos.
 * Reutiliza el motor local versionado aceptado (local-collection.ts) y el
 * ledger append-only existente (`inventory:movements`) — una sola verdad de
 * stock. Todo es «Workspace local»: nada aquí toca Shopify ni CoinOS.
 */

import { useCallback, useMemo } from "react";
import {
  INVENTORY_SCHEMA_VERSION,
  isMovement,
  type InventoryMovement,
} from "./inventory";
import { localId, useLedger, useVersionedCollection } from "./local-collection";
import {
  CATALOG_MIRROR_SCHEMA_VERSION,
  isMirrorRecord,
  type ShopifyCatalogMirrorRecord,
  type SyncConflict,
  type TemplateSnapshot,
} from "./catalog-mirror";
import {
  OFFICIAL_PRODUCTS_SCHEMA_VERSION,
  isOfficialProduct,
  variantStockKey,
  type PrimeBuildOfficialProduct,
} from "./official-products";
import {
  OWNED_INVENTORY_SCHEMA_VERSION,
  deriveOwnedInventory,
  publicationState,
  type InventoryReservation,
  type OwnedInventoryItem,
  type PublicationState,
} from "./owned-inventory";
import { STOREFRONT_SCHEMA_VERSION, type CartLine, type PrimeBuildOfficialOrder } from "./storefront";

/* ─────────────────────────── Claves locales ─────────────────────────── */

export const OFFICIAL_KEYS = {
  mirror: "official:mirror",
  templates: "official:templates",
  conflicts: "official:conflicts",
  products: "official:products",
  reservations: "official:reservations",
  cart: "official:cart",
  orders: "official:orders",
  events: "official:events",
} as const;

/** El ledger de movimientos es el EXISTENTE — una sola verdad de stock. */
export const MOVEMENTS_KEY = "inventory:movements";

/* ─────────────────────────── Eventos §73 ─────────────────────────── */

export const OFFICIAL_STORE_EVENTS = [
  "shopify.catalog_discovered",
  "shopify.template_copied",
  "shopify.sync_conflict",
  "official_inventory.received",
  "official_inventory.reserved",
  "official_inventory.released",
  "official_inventory.adjusted",
  "official_product.published",
  "official_product.hidden",
  "official_order.created",
  "official_order.payment_observed",
  "official_order.fulfillment_started",
  "official_order.shipped",
  "official_order.delivered",
  "pb.quote_created",
  "pb.store_price_created",
] as const;
export type OfficialStoreEventName = (typeof OFFICIAL_STORE_EVENTS)[number];

export interface StoreEvent {
  id: string;
  name: OfficialStoreEventName;
  at: string;
  /** Idempotencia: mismo correlationId + name no se emite dos veces. */
  correlationId?: string;
  payload?: Record<string, string | number | boolean>;
  version: number;
}

function isStoreEvent(x: unknown): x is StoreEvent {
  if (x === null || typeof x !== "object") return false;
  const e = x as Record<string, unknown>;
  return typeof e.id === "string" && typeof e.name === "string" && typeof e.at === "string";
}

export function useStoreEvents() {
  const col = useVersionedCollection<StoreEvent>(OFFICIAL_KEYS.events, 1, isStoreEvent);
  const emit = useCallback(
    (name: OfficialStoreEventName, payload?: StoreEvent["payload"], correlationId?: string) => {
      if (
        correlationId &&
        col.items.some((e) => e.name === name && e.correlationId === correlationId)
      ) {
        return; // idempotente
      }
      col.add({
        id: localId(),
        name,
        at: new Date().toISOString(),
        correlationId,
        payload,
        version: 1,
      });
    },
    [col],
  );
  return { events: col.items, ready: col.ready, emit };
}

/* ─────────────────────── Validadores ligeros ─────────────────────── */

function isReservation(x: unknown): x is InventoryReservation {
  if (x === null || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.idempotencyKey === "string" &&
    Array.isArray(r.items) &&
    typeof r.status === "string" &&
    typeof r.expiresAt === "string"
  );
}

function isTemplate(x: unknown): x is TemplateSnapshot {
  if (x === null || typeof x !== "object") return false;
  const t = x as Record<string, unknown>;
  return typeof t.id === "string" && typeof t.templateKind === "string" && typeof t.state === "string";
}

function isConflict(x: unknown): x is SyncConflict {
  if (x === null || typeof x !== "object") return false;
  const c = x as Record<string, unknown>;
  return typeof c.id === "string" && typeof c.field === "string";
}

function isCartLine(x: unknown): x is CartLine {
  if (x === null || typeof x !== "object") return false;
  const l = x as Record<string, unknown>;
  return (
    typeof l.id === "string" &&
    typeof l.productId === "string" &&
    typeof l.variantId === "string" &&
    typeof l.quantity === "number" &&
    l.priceQuote !== undefined
  );
}

function isOrder(x: unknown): x is PrimeBuildOfficialOrder {
  if (x === null || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.state === "string" && Array.isArray(o.items);
}

/* ─────────────────────────── Hooks ─────────────────────────── */

export function useMirror() {
  return useVersionedCollection<ShopifyCatalogMirrorRecord>(
    OFFICIAL_KEYS.mirror,
    CATALOG_MIRROR_SCHEMA_VERSION,
    isMirrorRecord,
  );
}

export function useTemplates() {
  return useVersionedCollection<TemplateSnapshot>(OFFICIAL_KEYS.templates, 1, isTemplate);
}

export function useSyncConflicts() {
  return useVersionedCollection<SyncConflict>(OFFICIAL_KEYS.conflicts, 1, isConflict);
}

export function useOfficialProducts() {
  return useVersionedCollection<PrimeBuildOfficialProduct>(
    OFFICIAL_KEYS.products,
    OFFICIAL_PRODUCTS_SCHEMA_VERSION,
    isOfficialProduct,
  );
}

export function useMovements() {
  return useLedger<InventoryMovement>(MOVEMENTS_KEY, INVENTORY_SCHEMA_VERSION, isMovement);
}

export function useReservations() {
  return useVersionedCollection<InventoryReservation>(
    OFFICIAL_KEYS.reservations,
    OWNED_INVENTORY_SCHEMA_VERSION,
    isReservation,
  );
}

export function useCartLines() {
  return useVersionedCollection<CartLine>(OFFICIAL_KEYS.cart, STOREFRONT_SCHEMA_VERSION, isCartLine);
}

export function useOfficialOrders() {
  return useVersionedCollection<PrimeBuildOfficialOrder>(
    OFFICIAL_KEYS.orders,
    STOREFRONT_SCHEMA_VERSION,
    isOrder,
  );
}

/* ─────────────── Inventario propio derivado (contrato §8) ─────────────── */

export interface OwnedInventoryView {
  ready: boolean;
  items: OwnedInventoryItem[];
  /** Disponible por clave de stock agregando almacenes. */
  availableByKey: (key: string) => number;
  availableByKeyWarehouse: (key: string, warehouseId: string) => number;
  nowIso: string;
}

export function useOwnedInventory(): OwnedInventoryView {
  const movements = useMovements();
  const reservations = useReservations();
  const nowIso = useMemo(() => new Date().toISOString(), []);

  const items = useMemo(
    () => deriveOwnedInventory(movements.entries, reservations.items, nowIso),
    [movements.entries, reservations.items, nowIso],
  );

  const availableByKey = useCallback(
    (key: string) =>
      items
        .filter((i) => i.inventoryItemId.startsWith(`${key}|||`))
        .reduce((acc, i) => acc + Math.max(0, i.available), 0),
    [items],
  );
  const availableByKeyWarehouse = useCallback(
    (key: string, warehouseId: string) =>
      items
        .filter((i) => i.inventoryItemId === `${key}|||${warehouseId}`)
        .reduce((acc, i) => acc + Math.max(0, i.available), 0),
    [items],
  );

  return { ready: movements.ready && reservations.ready, items, availableByKey, availableByKeyWarehouse, nowIso };
}

/* ─────────────── Catálogo visible del storefront (§10) ─────────────── */

export interface VisibleVariant {
  productId: string;
  variantId: string;
  available: number;
  /** Primer almacén con disponible > 0 (para reservas del carrito). */
  warehouseId: string | null;
}

export interface CatalogView {
  ready: boolean;
  products: PrimeBuildOfficialProduct[];
  /** Estado de publicación por producto (visible u oculto y por qué). */
  publication: Map<string, PublicationState>;
  /** Solo lo visible al público. */
  visibleProducts: PrimeBuildOfficialProduct[];
  variantAvailability: Map<string, VisibleVariant>;
}

/**
 * Catálogo del storefront: producto visible SOLO si alguna variante tiene
 * available > 0 y el producto es elegible con clasificación OWNED_STOCK
 * (los productos oficiales son siempre OWNED_STOCK; el espejo nunca entra).
 */
export function useStorefrontCatalog(): CatalogView {
  const products = useOfficialProducts();
  const inventory = useOwnedInventory();

  return useMemo(() => {
    const publication = new Map<string, PublicationState>();
    const variantAvailability = new Map<string, VisibleVariant>();
    const visibleProducts: PrimeBuildOfficialProduct[] = [];

    for (const p of products.items) {
      if (p.status === "retired") {
        publication.set(p.id, "hidden_not_eligible");
        continue;
      }
      let productAvailable = 0;
      for (const v of p.variants) {
        const key = variantStockKey(p, v);
        const totalAvailable = inventory.availableByKey(key);
        const slot = inventory.items.find(
          (i) => i.inventoryItemId.startsWith(`${key}|||`) && i.available > 0,
        );
        variantAvailability.set(v.id, {
          productId: p.id,
          variantId: v.id,
          available: totalAvailable,
          warehouseId: slot ? slot.warehouseId : null,
        });
        productAvailable += totalAvailable;
      }
      const state = publicationState({
        available: productAvailable,
        officialStoreEligible: p.officialStoreEligible,
        inventoryClassification: "OWNED_STOCK",
      });
      publication.set(p.id, state);
      if (state === "visible") visibleProducts.push(p);
    }

    return {
      ready: products.ready && inventory.ready,
      products: products.items,
      publication,
      visibleProducts,
      variantAvailability,
    };
  }, [products.items, products.ready, inventory]);
}
