"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/shop/product-card";
import { cardFromMirror } from "@/lib/mirror-card";
import { useLiveCatalog } from "@/lib/official-store-data";

/**
 * «Shop» (PBOS-SCLP-FABLE-002 §6 Catalog): grid 4/3/2 clonado del theme con
 * pills de orden (pb-sort) y recuento. Solo productos públicos según la
 * política de visibilidad.
 */

const SORTS = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" },
  { id: "title", label: "A–Z" },
] as const;

export default function ShopCatalogPage() {
  const live = useLiveCatalog();
  const [sort, setSort] = useState<(typeof SORTS)[number]["id"]>("featured");

  const cards = useMemo(() => {
    const list = live.publicProducts.map((p) => cardFromMirror(p, live.ownedAvailableOf(p)));
    const price = (c: { vnUsd?: string }) => parseFloat(c.vnUsd ?? "0");
    if (sort === "price-asc") list.sort((a, b) => price(a) - price(b));
    if (sort === "price-desc") list.sort((a, b) => price(b) - price(a));
    if (sort === "title") list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [live, sort]);

  return (
    <div className="pb-products" style={{ paddingTop: 40 }}>
      <h1 className="pbsf-serif-heading">Shop</h1>
      <div className="pb-sort-bar">
        {SORTS.map((s) => (
          <button
            key={s.id}
            className={`pb-sort-link${sort === s.id ? " pb-sort-active" : ""}`}
            onClick={() => setSort(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="pb-count">
        {live.ready ? `${cards.length} products` : "Cargando…"}
        {live.ready && live.mirrorProducts.length > cards.length
          ? ` · ${live.mirrorProducts.length - cards.length} espejados sin stock propio (ocultos)`
          : ""}
      </p>
      {cards.length === 0 && live.ready ? (
        <div className="pbsf-empty">
          <p>
            <strong>Sin productos públicos.</strong> El catálogo activo está espejado; se publica al
            recibir stock físico propio (política {live.policy?.mode}).
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
  );
}
