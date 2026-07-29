"use client";

import { useMemo } from "react";
import { ProductCard } from "@/components/shop/product-card";
import { cardFromMirror } from "@/lib/mirror-card";
import { useLiveCatalog } from "@/lib/official-store-data";

/**
 * New Arrivals (MEGA-004 004C): productos públicos ordenados por publishedAt
 * REAL de la fuente — sin urgencia inventada ni "nuevo" fabricado.
 */
export default function NewArrivalsPage() {
  const live = useLiveCatalog();
  const cards = useMemo(
    () =>
      [...live.publicProducts]
        .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
        .slice(0, 12)
        .map((p) => cardFromMirror(p, live.ownedAvailableOf(p))),
    [live],
  );

  return (
    <div className="pb-products" style={{ paddingTop: 40 }}>
      <h1 className="pbsf-serif-heading">New Arrivals</h1>
      <p className="pb-count">
        {live.ready
          ? `${cards.length} productos públicos, ordenados por fecha de publicación real en la fuente`
          : "Cargando…"}
      </p>
      {live.ready && cards.length === 0 ? (
        <div className="pbsf-empty">
          <p>
            <strong>Aún no hay novedades públicas.</strong> Un producto aparece aquí cuando está
            ACTIVO en el catálogo y tiene stock físico propio.
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
