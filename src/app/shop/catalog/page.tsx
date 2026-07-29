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

const PRICE_BANDS = [
  { id: "", label: "Cualquier precio" },
  { id: "0-25", label: "Hasta $25" },
  { id: "25-50", label: "$25 – $50" },
  { id: "50-", label: "Más de $50" },
] as const;

export default function ShopCatalogPage() {
  const live = useLiveCatalog();
  const [sort, setSort] = useState<(typeof SORTS)[number]["id"]>("featured");
  const [ptype, setPtype] = useState("");
  const [band, setBand] = useState("");

  // Filtros honestos (MEGA-004 004C): solo donde los datos existen — tipo de
  // producto y precio vienen del espejo real; disponibilidad ya es implícita
  // (todo lo público tiene stock propio).
  const types = useMemo(() => {
    const s = new Set<string>();
    for (const p of live.publicProducts) if (p.productType) s.add(p.productType);
    return [...s].sort();
  }, [live.publicProducts]);

  const cards = useMemo(() => {
    let pool = live.publicProducts;
    if (ptype) pool = pool.filter((p) => p.productType === ptype);
    const list = pool.map((p) => cardFromMirror(p, live.ownedAvailableOf(p)));
    const price = (c: { vnUsd?: string }) => parseFloat(c.vnUsd ?? "0");
    let filtered = list;
    if (band) {
      const sep = band.indexOf("-");
      const lo = parseFloat(band.slice(0, sep) || "0");
      const hiRaw = band.slice(sep + 1);
      filtered = list.filter((c) => {
        const v = price(c);
        return v >= lo && (hiRaw === "" || v <= parseFloat(hiRaw));
      });
    }
    if (sort === "price-asc") filtered.sort((a, b) => price(a) - price(b));
    if (sort === "price-desc") filtered.sort((a, b) => price(b) - price(a));
    if (sort === "title") filtered.sort((a, b) => a.title.localeCompare(b.title));
    return filtered;
  }, [live, sort, ptype, band]);

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
      <div className="pb-sort-bar">
        <button
          className={`pb-sort-link${ptype === "" ? " pb-sort-active" : ""}`}
          onClick={() => setPtype("")}
        >
          Todos los tipos
        </button>
        {types.map((t) => (
          <button
            key={t}
            className={`pb-sort-link${ptype === t ? " pb-sort-active" : ""}`}
            onClick={() => setPtype(ptype === t ? "" : t)}
          >
            {t}
          </button>
        ))}
        {PRICE_BANDS.map((b) => (
          <button
            key={b.id || "any"}
            className={`pb-sort-link${band === b.id ? " pb-sort-active" : ""}`}
            onClick={() => setBand(b.id)}
          >
            {b.label}
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
