"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { localId } from "@/lib/local-collection";
import { createReservation, transitionReservation } from "@/lib/owned-inventory";
import { checkoutFeeBreakdown, revalidatePriceQuote } from "@/lib/store-pricing";
import {
  createOrderDraft,
  orderTotals,
  transitionOrder,
  validateCartQuantities,
  type PaymentChoice,
} from "@/lib/storefront";
import {
  useCartLines,
  useMovements,
  useOfficialOrders,
  useOfficialProducts,
  useOwnedInventory,
  useReservations,
  useStoreEvents,
} from "@/lib/official-store-data";
import { formatPb, formatUsd } from "@/lib/pb-exchange/pb-exchange-sdk";

/**
 * Checkout (§46-§48): Carrito → Validación de inventario (reserva atómica
 * idempotente) → Dirección → Envío → Elección PB/USD → Vista previa del quote
 * (revalidada §38) → Revisión → Confirmación. Sin proveedor financiero el
 * pedido queda «Awaiting payment»: nada se cobra ni se marca pagado sin
 * evidencia observada.
 */

const STEPS = [
  "Validación",
  "Dirección",
  "Envío",
  "Pago",
  "Revisión",
  "Confirmación",
] as const;

export default function ShopCheckoutPage() {
  const cart = useCartLines();
  const movements = useMovements();
  const reservations = useReservations();
  const orders = useOfficialOrders();
  const products = useOfficialProducts();
  const inventory = useOwnedInventory();
  const { emit } = useStoreEvents();

  const [step, setStep] = useState(0);
  const [checkoutId] = useState(() => localId());
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [address, setAddress] = useState({ name: "", line1: "", city: "", country: "", postal: "" });
  const [shippingMethod, setShippingMethod] = useState("standard");
  const [payment, setPayment] = useState<PaymentChoice>("PB");
  const [confirmChanges, setConfirmChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  const items = useMemo(
    () =>
      cart.items.map((l) => ({
        id: l.id,
        productId: l.productId,
        variantId: l.variantId,
        title: l.title,
        variantTitle: l.variantTitle,
        sku: l.sku,
        warehouseId: l.warehouseId,
        quantity: l.quantity,
        priceQuote: l.priceQuote,
      })),
    [cart.items],
  );
  const totals = useMemo(() => orderTotals(items), [items]);

  const revalidations = useMemo(() => {
    const now = new Date().toISOString();
    return cart.items.map((l) => {
      const product = products.items.find((p) => p.id === l.productId);
      const variant = product?.variants.find((v) => v.id === l.variantId);
      return { line: l, result: revalidatePriceQuote(l.priceQuote, variant, now) };
    });
  }, [cart.items, products.items]);
  const priceChanged = revalidations.some((r) => !r.result.stillValid);

  const fees = useMemo(
    () => checkoutFeeBreakdown({ itemsVaTotalUsd: totals.vaTotalUsd, itemsVnTotalUsd: totals.vnTotalUsd }),
    [totals],
  );

  if (!cart.ready) return <p className="text-sm text-neutral-500">Cargando…</p>;
  if (cart.items.length === 0 && !orderId) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-700 p-12 text-center">
        <p className="text-sm text-neutral-400">No hay nada que pagar: el carrito está vacío.</p>
        <Link href="/shop/catalog" className="mt-2 inline-block text-sm text-amber-400 hover:underline">
          Ir a la tienda →
        </Link>
      </div>
    );
  }

  const validateAndReserve = () => {
    setError(null);
    const issues = validateCartQuantities(cart.items, inventory.availableByKeyWarehouse);
    if (issues.length > 0) {
      setError(issues[0]!.detail);
      return;
    }
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
    const result = createReservation(
      {
        idempotencyKey: `checkout:${checkoutId}`,
        items: cart.items.map((l) => ({
          sku: l.sku,
          productId: l.productId,
          warehouseId: l.warehouseId,
          quantity: l.quantity,
        })),
        expiresAt,
        sourceType: "checkout",
        sourceId: checkoutId,
        actor: "storefront",
      },
      { movements: movements.entries, reservations: reservations.items, nowIso: now, makeId: localId },
    );
    if (!result.ok) {
      setError(result.detail);
      return;
    }
    if (!result.idempotentReplay) {
      reservations.add(result.reservation);
      emit("official_inventory.reserved", { reservationId: result.reservation.id }, result.reservation.id);
    }
    setReservationId(result.reservation.id);
    setStep(1);
  };

  const confirmOrder = () => {
    setError(null);
    if (priceChanged && !confirmChanges) {
      setError("El precio cambió desde que añadiste artículos: confirma los cambios para continuar.");
      return;
    }
    const now = new Date().toISOString();
    const draft = createOrderDraft(
      {
        items,
        reservationId: reservationId ?? undefined,
        paymentChoice: payment,
        address,
        shipping: { method: shippingMethod === "standard" ? "Estándar (por cotizar)" : "Recogida en almacén" },
      },
      now,
      localId,
    );
    const awaiting = transitionOrder(draft, "Awaiting payment", "storefront", now);
    if (!awaiting.ok) {
      setError(awaiting.detail);
      return;
    }
    orders.add(awaiting.order);
    emit("official_order.created", { orderId: draft.id, payment }, draft.id);

    // La reserva pasa a Extended con vencimiento largo: sigue descontando
    // disponible hasta que el pedido se envíe (la salida del ledger ocurre al
    // enviar, desde el Admin) o se cancele.
    const r = reservations.items.find((x) => x.id === reservationId);
    if (r) {
      const extended = transitionReservation(r, "Extended", now, new Date(Date.now() + 7 * 86400_000).toISOString());
      if (extended) reservations.update(r.id, extended);
    }
    cart.replaceAll([]);
    setOrderId(draft.id);
    setStep(5);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-bold">Checkout</h1>
      <ol className="flex flex-wrap gap-1.5 text-[0.7rem]">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={`rounded-full px-2.5 py-1 ${
              i === step
                ? "bg-amber-500 font-semibold text-black"
                : i < step
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-neutral-800 text-neutral-500"
            }`}
          >
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      {error ? (
        <p className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </p>
      ) : null}

      {step === 0 ? (
        <section className="rounded-xl border border-neutral-800 p-5">
          <h2 className="text-sm font-semibold">Validación de inventario y reserva</h2>
          <p className="mt-1 text-xs text-neutral-400">
            Reservamos tus {totals.itemsCount} unidades durante 30 minutos con una reserva atómica e
            idempotente — nadie más puede comprarlas mientras terminas.
          </p>
          <button
            onClick={validateAndReserve}
            className="mt-4 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-400"
          >
            Validar stock y reservar
          </button>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="rounded-xl border border-neutral-800 p-5">
          <h2 className="text-sm font-semibold">Dirección de entrega</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(
              [
                ["name", "Nombre completo"],
                ["line1", "Dirección"],
                ["city", "Ciudad"],
                ["postal", "Código postal"],
                ["country", "País"],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="flex flex-col gap-1">
                <span className="text-xs text-neutral-500">{label}</span>
                <input
                  value={address[k]}
                  onChange={(e) => setAddress((a) => ({ ...a, [k]: e.target.value }))}
                  className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
                />
              </label>
            ))}
          </div>
          <button
            onClick={() => {
              if (!address.name.trim() || !address.line1.trim() || !address.city.trim() || !address.country.trim()) {
                setError("Completa nombre, dirección, ciudad y país.");
                return;
              }
              setError(null);
              setStep(2);
            }}
            className="mt-4 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-400"
          >
            Continuar
          </button>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="rounded-xl border border-neutral-800 p-5">
          <h2 className="text-sm font-semibold">Método de envío</h2>
          <div className="mt-3 flex flex-col gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-neutral-700 px-4 py-3 text-sm">
              <input
                type="radio"
                checked={shippingMethod === "standard"}
                onChange={() => setShippingMethod("standard")}
              />
              Envío estándar — coste por cotizar (se confirma antes de pagar; no se inventa un 0)
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-neutral-700 px-4 py-3 text-sm">
              <input
                type="radio"
                checked={shippingMethod === "pickup"}
                onChange={() => setShippingMethod("pickup")}
              />
              Recogida en almacén — sin coste de envío
            </label>
          </div>
          <button
            onClick={() => setStep(3)}
            className="mt-4 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-400"
          >
            Continuar
          </button>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="rounded-xl border border-neutral-800 p-5">
          <h2 className="text-sm font-semibold">Elige cómo pagar</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => setPayment("PB")}
              className={`rounded-xl border p-4 text-left ${
                payment === "PB" ? "border-amber-400 bg-amber-500/10" : "border-neutral-700"
              }`}
            >
              <p className="font-semibold text-amber-300">Pagar con PB</p>
              <p className="mt-1 font-mono text-lg">{formatPb(totals.pbTotalDisplay)}</p>
              <p className="mt-1 text-xs text-neutral-400">
                Modo cotización: el pedido quedará pendiente de pago hasta que el proveedor PB esté
                conectado. Nada se liquida hoy.
              </p>
            </button>
            <button
              onClick={() => setPayment("USD")}
              className={`rounded-xl border p-4 text-left ${
                payment === "USD" ? "border-amber-400 bg-amber-500/10" : "border-neutral-700"
              }`}
            >
              <p className="font-semibold">Pagar en USD</p>
              <p className="mt-1 font-mono text-lg">{formatUsd(totals.vnTotalUsd)}</p>
              <p className="mt-1 text-xs text-neutral-400">
                Opción secundaria siempre disponible. El pago se registra como observación con
                referencia externa.
              </p>
            </button>
          </div>
          <button
            onClick={() => setStep(4)}
            className="mt-4 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-400"
          >
            Ver vista previa del quote
          </button>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="flex flex-col gap-4">
          <div className="rounded-xl border border-neutral-800 p-5">
            <h2 className="text-sm font-semibold">Vista previa y revisión</h2>
            {priceChanged ? (
              <div className="mt-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-xs text-amber-300">
                <p className="font-semibold">El precio cambió desde que añadiste artículos:</p>
                <ul className="mt-1 list-inside list-disc">
                  {revalidations
                    .filter((r) => !r.result.stillValid)
                    .flatMap((r) => r.result.changes.map((c) => `${r.line.title}: ${c}`))
                    .map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                </ul>
                <label className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={confirmChanges}
                    onChange={(e) => setConfirmChanges(e.target.checked)}
                  />
                  Acepto los cambios de precio
                </label>
              </div>
            ) : null}
            <dl className="mt-3 flex flex-col gap-1.5 text-sm">
              <Row k="Artículos" v={formatUsd(fees.itemsUsd)} />
              <Row k="Descuento Official Store" v={`−${formatUsd(fees.storeDiscountUsd)} (ya aplicado)`} />
              <Row k="Comisión de transferencia" v={`${fees.transferFeeUsd} — no aplica a compras`} />
              <Row k="Comisión del proveedor" v="Desconocida — sin proveedor conectado" />
              <Row k="Envío" v={fees.shippingUsd === "not_quoted" ? "Por cotizar" : formatUsd(fees.shippingUsd)} />
              <Row k="Impuestos" v={fees.taxesUsd === "not_quoted" ? "Por cotizar" : formatUsd(fees.taxesUsd)} />
              <div className="mt-1 flex justify-between border-t border-neutral-800 pt-2 font-semibold">
                <dt>Total {payment === "PB" ? "PB" : "USD"}</dt>
                <dd className="font-mono text-amber-300">
                  {payment === "PB" ? formatPb(totals.pbTotalDisplay) : formatUsd(totals.vnTotalUsd)}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-[0.7rem] text-neutral-500">
              Snapshot de tasa del contrato PB_EXCHANGE_V1 conservado por línea. El redondeo mostrado es
              el que se aplica.
            </p>
          </div>
          <button
            onClick={confirmOrder}
            className="rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-black hover:bg-amber-400"
          >
            Confirmar pedido
          </button>
        </section>
      ) : null}

      {step === 5 && orderId ? (
        <section className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-8 text-center">
          <p className="text-2xl">✓</p>
          <h2 className="mt-2 text-lg font-semibold">Pedido creado</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Tu pedido quedó <span className="font-mono">Awaiting payment</span>: sin proveedor
            financiero conectado no se cobra nada. Tu stock queda reservado.
          </p>
          <Link
            href={`/shop/orders/${orderId}`}
            className="mt-4 inline-block rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-400"
          >
            Ver estado del pedido
          </Link>
        </section>
      ) : null}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-neutral-400">{k}</dt>
      <dd className="font-mono text-neutral-200">{v}</dd>
    </div>
  );
}
