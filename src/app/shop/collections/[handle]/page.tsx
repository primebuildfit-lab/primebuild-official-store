"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ProductCard } from "@/components/shop/product-card";
import { STOREFRONT_MAIN_MENU } from "@/config/storefront-menu";
import { cardFromMirror, mirrorProductsInCollection } from "@/lib/mirror-card";
import { useLiveCatalog } from "@/lib/official-store-data";

/**
 * Página de colección clonada (PBOS-SCLP-FABLE-002 §6): «SHOP BY CATEGORY» en
 * círculos (pb-subcat, anillo dorado en la activa), pills de subcolecciones y
 * grid 4/3/2. Estructura y relaciones vienen del mirror; la visibilidad, de la
 * política + stock propio. Colección vacía: estado honesto, no se inventa.
 */
export default function ShopCollectionPage() {
  const params = useParams<{ handle: string }>();
  const handle = decodeURIComponent(params.handle);
  const live = useLiveCatalog();

  const collection = live.collections.find((c) => c.handle === handle);
  // Círculos: las subcolecciones del grupo del menú al que pertenece esta colección.
  const menuGroup = STOREFRONT_MAIN_MENU.find(
    (m) => m.href.endsWith(`/${handle}`) || m.children?.some((c) => c.href.endsWith(`/${handle}`)),
  );
  const circles = (menuGroup?.children ?? [])
    .map((c) => {
      const h = c.href.split("/").pop() ?? "";
      const col = live.collections.find((x) => x.handle === h);
      return col ? { handle: h, title: c.title, image: col.imageUrl } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const products = mirrorProductsInCollection(live.publicProducts, handle, collection?.ruleTag);
  const cards = products.map((p) => cardFromMirror(p, live.ownedAvailableOf(p)));

  return (
    <div>
      {circles.length > 0 ? (
        <section className="pb-subcat">
          <h2 className="pb-subcat-heading">Shop by category</h2>
          <div className="pb-subcat-track">
            {circles.map((c) => (
              <Link
                key={c.handle}
                href={`/shop/collections/${encodeURIComponent(c.handle)}`}
                className={`pb-subcat-item${c.handle === handle ? " pb-active" : ""}`}
              >
                <span className="pb-subcat-thumb">
                  {c.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image} alt={c.title} loading="lazy" />
                  ) : null}
                </span>
                <span className="pb-subcat-label">{c.title}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="pb-products">
        <h1 className="pbsf-serif-heading">{collection?.title ?? handle}</h1>
        {menuGroup?.children ? (
          <div className="pb-sort-bar">
            {[{ title: "ALL", href: menuGroup.href }, ...menuGroup.children].map((c) => {
              const h = c.href.split("/").pop() ?? "";
              return (
                <Link
                  key={c.title}
                  href={c.href}
                  className={`pb-sort-link${h === handle ? " pb-sort-active" : ""}`}
                >
                  {c.title}
                </Link>
              );
            })}
          </div>
        ) : null}
        <p className="pb-count">{live.ready ? `${cards.length} products` : "Cargando…"}</p>
        {live.ready && cards.length === 0 ? (
          <div className="pbsf-empty">
            <p>
              <strong>Esta colección no tiene productos públicos ahora mismo.</strong> Los productos
              activos de Shopify están espejados y se publican al tener stock físico propio.
            </p>
          </div>
        ) : (
          <div className="pb-grid">
            {cards.map((c) => (
              <ProductCard key={c.id} product={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
