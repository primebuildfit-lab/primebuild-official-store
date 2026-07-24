"use client";

import Link from "next/link";
import { useLiveCatalog } from "@/lib/official-store-data";

/** Índice de colecciones (§26 /shop/collections): tiles con imagen real. */
export default function ShopCollectionsIndexPage() {
  const live = useLiveCatalog();
  const withImage = live.collections.filter((c) => c.imageUrl);
  return (
    <div className="pb-bento-section">
      <h1 className="pbsf-serif-heading">Collections</h1>
      <div className="pb-bento-grid">
        {withImage.map((c) => (
          <Link key={c.handle} href={`/shop/collections/${encodeURIComponent(c.handle)}`} className="pb-bento-tile">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.imageUrl} alt={c.title} loading="lazy" />
            <span className="pb-overlay" />
            <span className="pb-label">{c.title}</span>
            <span className="pb-accent" />
          </Link>
        ))}
      </div>
      {live.ready && withImage.length === 0 ? (
        <p className="pbsf-empty">Sin colecciones espejadas todavía.</p>
      ) : null}
    </div>
  );
}
