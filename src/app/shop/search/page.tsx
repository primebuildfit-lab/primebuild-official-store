"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/shop/product-card";
import { cardFromMirror } from "@/lib/mirror-card";
import { useLiveCatalog } from "@/lib/official-store-data";

/** Búsqueda (PBOS-SCLP-FABLE-002 §26): input pill + grid clonado del theme. */
export default function ShopSearchPage() {
  const live = useLiveCatalog();
  const [q, setQ] = useState("");

  const cards = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return live.publicProducts
      .filter(
        (p) =>
          p.title.toLowerCase().includes(needle) ||
          p.tags.some((t) => t.toLowerCase().includes(needle)),
      )
      .map((p) => cardFromMirror(p, live.ownedAvailableOf(p)));
  }, [live, q]);

  return (
    <div>
      <div className="pbsf-search-head">
        <h1 className="pbsf-serif-heading">Search</h1>
        <input
          className="pbsf-search-input"
          placeholder="Search products…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
          aria-label="Buscar productos"
        />
      </div>
      <div className="pb-products" style={{ paddingTop: 28 }}>
        {q.trim() ? (
          <>
            <p className="pb-count">
              {cards.length} results for “{q.trim()}”
            </p>
            <div className="pb-grid">
              {cards.map((c) => (
                <ProductCard key={c.id} product={c} />
              ))}
            </div>
          </>
        ) : (
          <p className="pbsf-empty">Escribe para buscar en el catálogo público.</p>
        )}
      </div>
    </div>
  );
}
