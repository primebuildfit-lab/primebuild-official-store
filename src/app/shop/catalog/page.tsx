"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/shop/product-card";
import { useStorefrontCatalog } from "@/lib/official-store-data";

/** Catálogo completo (§42): búsqueda + filtro por colección; solo visibles (§10). */
export default function ShopCatalogPage() {
  const catalog = useStorefrontCatalog();
  const [q, setQ] = useState("");
  const [collection, setCollection] = useState<string>("");

  const collections = useMemo(() => {
    const s = new Set<string>();
    for (const p of catalog.visibleProducts) for (const c of p.collections) s.add(c);
    return [...s].sort();
  }, [catalog.visibleProducts]);

  const filtered = catalog.visibleProducts.filter((p) => {
    const matchesQ =
      !q.trim() ||
      p.title.toLowerCase().includes(q.trim().toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(q.trim().toLowerCase()));
    const matchesC = !collection || p.collections.includes(collection);
    return matchesQ && matchesC;
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Tienda</h1>
        <p className="text-sm text-neutral-400">
          Solo productos con stock físico disponible. Los agotados se ocultan automáticamente.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar productos…"
          className="w-full max-w-xs rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-amber-400/60"
          aria-label="Buscar"
        />
        <select
          value={collection}
          onChange={(e) => setCollection(e.target.value)}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          aria-label="Colección"
        >
          <option value="">Todas las colecciones</option>
          {collections.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="text-xs text-neutral-500">
          {filtered.length} producto{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {!catalog.ready ? (
        <p className="text-sm text-neutral-500">Cargando…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-700 p-10 text-center text-sm text-neutral-400">
          Sin resultados con stock disponible.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
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
