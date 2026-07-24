"use client";

import Link from "next/link";
import { useMemo } from "react";
import { validateCartQuantities, orderTotals } from "@/lib/storefront";
import { useCartLines, useOwnedInventory } from "@/lib/official-store-data";
import { formatPb, formatUsd } from "@/lib/pb-exchange/pb-exchange-sdk";

/**
 * Carrito clonado (PBOS-SCLP-FABLE-002 §6 Cart): esquema CLARO como el real —
 * «Your cart is empty» centrado sobre blanco, pill negro «Continue shopping» y
 * la tarjeta oscura de PB COINS. Con líneas: lista clara con imagen, cantidad
 * y totales PB primario + USD secundario, validadas contra el stock propio.
 */
export default function ShopCartPage() {
  const cart = useCartLines();
  const inventory = useOwnedInventory();

  const issues = useMemo(
    () => validateCartQuantities(cart.items, inventory.availableByKeyWarehouse),
    [cart.items, inventory],
  );
  const totals = useMemo(
    () =>
      orderTotals(
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
      ),
    [cart.items],
  );

  return (
    <div className="pbsf-light" style={{ flex: 1 }}>
      <div className="pbsf-cart-page">
        {!cart.ready ? null : cart.items.length === 0 ? (
          <>
            <div className="pbsf-cart-empty">
              <h1>Your cart is empty</h1>
              <p>
                ¿Buscas el catálogo?{" "}
                <Link href="/shop/catalog" className="pbsf-underline">
                  Ver la tienda
                </Link>{" "}
                para seguir comprando.
              </p>
              <Link href="/shop/catalog" className="pbsf-btn-black">
                Continue shopping
              </Link>
            </div>
            <div className="pbsf-coins-card">
              <div className="pbsf-coins-card__head">
                <span className="pbsf-coins-card__brand">
                  <span className="pb-rewards-bar__coin-symbol">PB</span> PB COINS
                </span>
                <span className="pbsf-coins-card__tag">Available</span>
              </div>
              <p>Los PB Coins del programa de recompensas viven en primebuildfit.com.</p>
              <p>
                En esta tienda el PB es el precio principal (contrato PB Exchange V1, modo
                cotización sin proveedor).
              </p>
              <a href="https://primebuildfit.com/pages/rewards-center" target="_blank" rel="noreferrer">
                Rewards Center →
              </a>
            </div>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 600, margin: "0 0 20px" }}>Your cart</h1>
            {cart.items.map((l) => {
              const lineIssues = issues.filter((i) => i.lineId === l.id);
              return (
                <div key={l.id} className="pbsf-cart-line">
                  <div style={{ flex: 1 }}>
                    <p className="pbsf-cart-line-title">{l.title}</p>
                    <p className="pbsf-cart-line-meta">
                      {l.variantTitle} · {l.sku ?? "sin SKU"} · × {l.quantity}
                    </p>
                    {lineIssues.map((i) => (
                      <p key={i.kind} className="pbsf-cart-line-meta" style={{ color: "#b42318" }}>
                        {i.detail}
                      </p>
                    ))}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p className="pbsf-cart-line-title" style={{ color: "#8a6d1a" }}>
                      {formatPb((parseFloat(l.priceQuote.snapshot.pbDisplay) * l.quantity).toFixed(2))}
                    </p>
                    <p className="pbsf-cart-line-meta">
                      ≈ {formatUsd((parseFloat(l.priceQuote.snapshot.vnUsd) * l.quantity).toFixed(2))}
                    </p>
                  </div>
                  <button className="pbsf-cart-remove" onClick={() => cart.remove(l.id)}>
                    Remove
                  </button>
                </div>
              );
            })}
            <div className="pbsf-cart-totals">
              <span className="pbsf-total-line">
                <span>Referencia</span>
                <s>{formatUsd(totals.vaTotalUsd)}</s>
              </span>
              <span className="pbsf-total-line">
                <span>Ahorro Official Store</span>
                <span style={{ color: "#067647" }}>−{formatUsd(totals.savingsUsd)}</span>
              </span>
              <span className="pbsf-total-line pbsf-total-strong">
                <span>Total</span>
                <span>
                  {formatPb(totals.pbTotalDisplay)} · {formatUsd(totals.vnTotalUsd)}
                </span>
              </span>
              <p className="pbsf-cart-line-meta">
                Envío e impuestos se calculan en el checkout. PB en modo cotización sin proveedor.
              </p>
              <Link
                href={issues.length === 0 ? "/shop/checkout" : "#"}
                aria-disabled={issues.length > 0}
                className="pbsf-btn-black"
                style={issues.length > 0 ? { opacity: 0.4, pointerEvents: "none" } : undefined}
              >
                {issues.length === 0 ? "Check out" : "Corrige las cantidades"}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
