"use client";

import Link from "next/link";
import {
  STOREFRONT_BENTO_TILES,
  STOREFRONT_CATEGORY_DESCRIPTIONS,
  STOREFRONT_HERO,
} from "@/config/storefront-menu";
import { ProductCard, type CardProduct } from "./product-card";

/**
 * Secciones de la home clonadas del theme «Primebuild 1.1»
 * (PBOS-SCLP-FABLE-002 §6): hero de vídeo, bento de colecciones, franjas de
 * productos destacados con heading serif y descripciones de categoría.
 */

export function HeroSection() {
  return (
    <section className="pbsf-hero">
      <video
        src={STOREFRONT_HERO.videoUrl}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden
      />
      <div className="pbsf-hero-overlay" />
      <div className="pbsf-hero-content">
        <h1 className="pbsf-hero-heading">{STOREFRONT_HERO.heading}</h1>
        <Link href={STOREFRONT_HERO.ctaHref} className="pbsf-btn-pill">
          {STOREFRONT_HERO.ctaLabel}
        </Link>
      </div>
    </section>
  );
}

export function BentoCategoryGrid() {
  return (
    <section className="pb-bento-section">
      <h2 className="pbsf-serif-heading">Shop by collection</h2>
      <div className="pb-bento-grid">
        {STOREFRONT_BENTO_TILES.map((tile) => (
          <Link key={tile.label} href={tile.href} className="pb-bento-tile">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={tile.image} alt={tile.label} loading="lazy" />
            <span className="pb-overlay" />
            <span className="pb-label">{tile.label}</span>
            <span className="pb-accent" />
          </Link>
        ))}
      </div>
    </section>
  );
}

export function FeaturedStrip({
  heading,
  viewAllHref,
  products,
}: {
  heading: string;
  viewAllHref: string;
  products: CardProduct[];
}) {
  if (products.length === 0) return null;
  return (
    <section className="pb-featured">
      <div className="pb-featured-header">
        <h2 className="pb-featured-heading">{heading}</h2>
        <Link href={viewAllHref} className="pb-featured-link">
          Shop all
        </Link>
      </div>
      <div className="pb-featured-grid">
        {products.slice(0, 4).map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

export function CategoryDescriptions() {
  return (
    <section className="pb-catdesc">
      <div className="pb-catdesc-grid">
        {STOREFRONT_CATEGORY_DESCRIPTIONS.map((c) => (
          <div key={c.eyebrow}>
            <span className="pb-catdesc-eyebrow">{c.eyebrow}</span>
            <h3 className="pb-catdesc-heading">{c.heading}</h3>
            <p className="pb-catdesc-body">{c.body}</p>
            <Link href={c.href} className="pb-catdesc-link">
              {c.linkLabel}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
