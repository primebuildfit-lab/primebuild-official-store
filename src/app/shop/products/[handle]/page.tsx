"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProductCard } from "@/components/shop/product-card";
import { localId } from "@/lib/local-collection";
import { cardFromMirror, officialFromMirror } from "@/lib/mirror-card";
import { sanitizeProductHtml } from "@/lib/official-products";
import { computeVariantPrice } from "@/lib/store-pricing";
import { formatPb, formatUsd } from "@/lib/pb-exchange/pb-exchange-sdk";
import {
  useCartLines,
  useLiveCatalog,
  useOwnedInventory,
  useStoreEvents,
} from "@/lib/official-store-data";

/**
 * PDP clonada del theme (PBOS-SCLP-FABLE-002 §6): galería 2 columnas a la
 * izquierda, columna de compra sticky a la derecha con pills de variante
 * (negro sólido = seleccionada), stepper de cantidad, «Add to cart» pill negro
 * y el bloque PB dorado como pago principal (§24: PB primario, USD
 * secundario). El stock mostrado es el propio del ledger; el supplier stock
 * del espejo jamás vende.
 */
export default function ShopProductPage() {
  const params = useParams<{ handle: string }>();
  const router = useRouter();
  const handle = decodeURIComponent(params.handle);
  const live = useLiveCatalog();
  const inventory = useOwnedInventory();
  const cart = useCartLines();
  const { emit } = useStoreEvents();

  const mirror = live.mirrorProducts.find((p) => p.handle === handle);
  const isPublic = live.publicProducts.some((p) => p.handle === handle);
  const product = useMemo(() => (mirror ? officialFromMirror(mirror) : null), [mirror]);

  const [variantId, setVariantId] = useState("");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const variant = product?.variants.find((v) => v.id === (variantId || product.variants[0]?.id));
  const sku = variant?.sku?.trim() ?? "";
  const available = sku ? live.ownedAvailableBySku(sku) : 0;
  const warehouseId = useMemo(() => {
    if (!sku) return null;
    const slot = inventory.items.find(
      (i) => i.inventoryItemId.startsWith(`${sku}|||`) && i.available > 0,
    );
    return slot?.warehouseId ?? null;
  }, [inventory.items, sku]);

  const price = useMemo(() => {
    if (!product || !variant) return null;
    const r = computeVariantPrice(product, variant, new Date().toISOString(), localId);
    return r.ok ? r.quote : null;
  }, [product, variant]);

  const recos = useMemo(
    () =>
      live.publicProducts
        .filter((p) => p.handle !== handle)
        .slice(0, 4)
        .map((p) => cardFromMirror(p, live.ownedAvailableOf(p))),
    [live, handle],
  );

  if (!live.ready) return <p className="pbsf-empty">Cargando…</p>;
  if (!mirror || !isPublic) {
    return (
      <div className="pbsf-empty">
        <p>
          <strong>Este producto no está disponible en la Official Store ahora mismo.</strong>
        </p>
        <p>
          {mirror
            ? "Está espejado del catálogo activo pero sin stock físico propio disponible."
            : "No existe en el espejo del catálogo."}
        </p>
        <p>
          <Link href="/shop/catalog" className="pb-featured-link">
            ← Back to shop
          </Link>
        </p>
      </div>
    );
  }

  const compareAt = mirror.variants.find((v) => v.compareAtPriceUsd)?.compareAtPriceUsd;

  const addToCart = () => {
    if (!product || !variant || !price || qty < 1 || qty > available || !warehouseId) return;
    cart.add({
      id: localId(),
      productId: product.id,
      variantId: variant.id,
      title: product.title,
      variantTitle: variant.title,
      sku: variant.sku,
      warehouseId,
      quantity: qty,
      priceQuote: price,
      addedAt: new Date().toISOString(),
    });
    emit(
      "pb.store_price_created",
      { productId: mirror.shopifyProductId, vn: price.snapshot.vnUsd },
      price.id,
    );
    setAdded(true);
  };

  // Product schema (§28) — datos reales del espejo, precio VN observable.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: mirror.title,
    image: mirror.mediaUrls,
    description: mirror.seo?.description,
    brand: { "@type": "Brand", name: mirror.vendor ?? "PrimeBuild" },
    offers: price
      ? {
          "@type": "Offer",
          priceCurrency: "USD",
          price: price.snapshot.vnUsd,
          availability:
            available > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        }
      : undefined,
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="pbsf-pdp">
        <div className="pbsf-pdp-gallery">
          {mirror.mediaUrls.length === 0 ? (
            <div
              style={{
                aspectRatio: "1 / 1",
                background: "var(--pbsf-bg-tile)",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#333",
                fontSize: 56,
                gridColumn: "span 2",
              }}
              aria-label="Producto sin imágenes en la fuente"
            >
              ◫
            </div>
          ) : (
            mirror.mediaUrls.slice(0, 8).map((u) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={u} src={u} alt={mirror.title} loading="lazy" />
            ))
          )}
        </div>

        <div className="pbsf-pdp-buy">
          <h1 className="pbsf-pdp-title">{mirror.title}</h1>
          <div className="pbsf-pdp-price">
            {price ? (
              <>
                <span className="pbsf-pdp-pb">{formatPb(price.snapshot.pbDisplay)}</span>
                <span>{formatUsd(price.snapshot.vnUsd)}</span>
                <span className="pb-price-compare">
                  {formatUsd(compareAt ?? price.snapshot.vaUsd)}
                </span>
              </>
            ) : (
              <span>Precio pendiente de referencia</span>
            )}
          </div>

          {product && product.options.length > 0 && product.variants.length > 1
            ? product.options.map((opt) => (
                <div key={opt.name}>
                  <p className="pbsf-option-label">{opt.name}</p>
                  <div className="pbsf-option-row">
                    {opt.values.map((val) => {
                      const match = product.variants.find(
                        (v) =>
                          v.options?.[opt.name] === val &&
                          Object.entries(variant?.options ?? {}).every(
                            ([k, sel]) => k === opt.name || v.options?.[k] === sel,
                          ),
                      );
                      const selected = variant?.options?.[opt.name] === val;
                      return (
                        <button
                          key={val}
                          className={`pbsf-variant-pill${selected ? " pbsf-selected" : ""}`}
                          disabled={!match}
                          onClick={() => match && setVariantId(match.id)}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            : null}

          <p className="pbsf-stock-note">
            {available > 0 ? (
              <>
                <strong>{available} disponibles</strong> · stock físico propio (ledger de almacén)
              </>
            ) : (
              "Sin stock físico propio para esta variante"
            )}
          </p>

          <div className="pbsf-buy-row">
            <span className="pbsf-qty">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Menos">
                −
              </button>
              <input
                type="number"
                value={qty}
                min={1}
                max={Math.max(1, available)}
                onChange={(e) =>
                  setQty(Math.max(1, Math.min(available || 1, Number(e.target.value) || 1)))
                }
                aria-label="Cantidad"
              />
              <button onClick={() => setQty((q) => Math.min(available || 1, q + 1))} aria-label="Más">
                +
              </button>
            </span>
            <button className="pbsf-add-to-cart" onClick={addToCart} disabled={!price || available <= 0}>
              Add to cart
            </button>
          </div>
          {added ? (
            <button className="pbsf-pay-pb" onClick={() => router.push("/shop/cart")}>
              ✓ Añadido — ver carrito
            </button>
          ) : (
            <button className="pbsf-pay-pb" onClick={addToCart} disabled={!price || available <= 0}>
              Pagar con PB {price ? `· ${formatPb(price.snapshot.pbDisplay)}` : ""}
            </button>
          )}
          <span className="pbsf-more-options">
            USD disponible en el checkout · PB en modo cotización sin proveedor
          </span>

          {mirror.descriptionHtml ? (
            <div
              className="pbsf-pdp-desc"
              dangerouslySetInnerHTML={{ __html: sanitizeProductHtml(mirror.descriptionHtml) }}
            />
          ) : null}
        </div>
      </div>

      {recos.length > 0 ? (
        <div className="pbsf-recos">
          <h2 className="pbsf-recos-heading">You may also like</h2>
          <div className="pb-grid">
            {recos.map((c) => (
              <ProductCard key={c.id} product={c} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
