"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ProductCard } from "@/components/shop/product-card";
import { useStorefrontCatalog } from "@/lib/official-store-data";

/** Colección (§42): productos visibles de una colección concreta. */
export default function ShopCollectionPage() {
  const params = useParams<{ handle: string }>();
  const handle = decodeURIComponent(params.handle);
  const catalog = useStorefrontCatalog();

  const products = catalog.visibleProducts.filter((p) => p.collections.includes(handle));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Link href="/shop/catalog" className="text-xs text-neutral-500 hover:text-neutral-300">
          ← Tienda
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{handle}</h1>
        <p className="text-sm text-neutral-400">
          {products.length} producto{products.length === 1 ? "" : "s"} con stock disponible.
        </p>
      </header>
      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-700 p-10 text-center text-sm text-neutral-400">
          Esta colección no tiene productos con stock ahora mismo.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
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
    </div>
  );
}
