"use client";

import Link from "next/link";
import { ProductCard } from "@/components/shop/product-card";
import { useStorefrontCatalog } from "@/lib/official-store-data";

/**
 * Home del storefront (§42): héroe de marca, colecciones y productos visibles
 * (solo con stock propio disponible — §10). Sin productos publicados, el
 * estado vacío es honesto: la tienda no inventa catálogo.
 */
export default function ShopHomePage() {
  const catalog = useStorefrontCatalog();

  const collections = new Map<string, number>();
  for (const p of catalog.visibleProducts) {
    for (const c of p.collections) collections.set(c, (collections.get(c) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900 via-[#0c0d13] to-[#151008] px-8 py-14">
        <div className="max-w-xl">
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.25em] text-amber-400">
            Inventario físico propio
          </p>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            Stock real. Envío rápido verificado.
            <span className="text-amber-300"> Paga en PB.</span>
          </h1>
          <p className="mt-3 text-sm text-neutral-400">
            Todo lo que ves está físicamente en nuestros almacenes: sin intermediarios, con un 10 %
            menos que el precio de referencia y el precio principal en PB (USD siempre visible).
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/shop/catalog"
              className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-400"
            >
              Ver la tienda
            </Link>
            <Link
              href="/shop/bulk"
              className="rounded-lg border border-neutral-700 px-5 py-2.5 text-sm hover:border-amber-400/60"
            >
              Compra por volumen
            </Link>
          </div>
        </div>
      </section>

      {collections.size > 0 ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Colecciones</h2>
          <div className="flex flex-wrap gap-2">
            {[...collections.entries()].map(([handle, count]) => (
              <Link
                key={handle}
                href={`/shop/collections/${encodeURIComponent(handle)}`}
                className="rounded-full border border-neutral-700 px-4 py-1.5 text-sm text-neutral-300 hover:border-amber-400/60 hover:text-white"
              >
                {handle} <span className="text-neutral-500">({count})</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Disponible ahora</h2>
          <Link href="/shop/catalog" className="text-sm text-amber-400 hover:underline">
            Ver todo →
          </Link>
        </div>
        {!catalog.ready ? (
          <p className="text-sm text-neutral-500">Cargando catálogo…</p>
        ) : catalog.visibleProducts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-700 p-10 text-center">
            <p className="text-sm text-neutral-400">
              Todavía no hay productos con stock físico disponible.
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              El catálogo solo muestra unidades reales de nuestros almacenes; los productos sin stock
              se ocultan automáticamente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {catalog.visibleProducts.slice(0, 8).map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                availableTotal={p.variants.reduce(
                  (acc, v) => acc + (catalog.variantAvailability.get(v.id)?.available ?? 0),
                  0,
                )}
              />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            t: "Stock en vivo",
            d: "Disponibilidad derivada del ledger de almacén con fuente y hora — nunca inventada.",
          },
          {
            t: "Precio principal en PB",
            d: "10 % bajo el precio de referencia, convertido con el contrato PB Exchange V1. USD como opción secundaria.",
          },
          {
            t: "Envío rápido veraz",
            d: "La insignia ⚡ solo aparece con stock confirmado, almacén asignado, transportista y SLA registrados.",
          },
        ].map((f) => (
          <div key={f.t} className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-5">
            <h3 className="text-sm font-semibold text-amber-300">{f.t}</h3>
            <p className="mt-1.5 text-xs text-neutral-400">{f.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
