"use client";

import Link from "next/link";
import { ProductCard } from "@/components/shop/product-card";
import { cardFromMirror } from "@/lib/mirror-card";
import { useLiveCatalog } from "@/lib/official-store-data";

/**
 * Owned Inventory (MEGA-004 004C): la promesa central de la tienda con prueba
 * honesta — lo que ves aquí ES el stock físico propio disponible ahora mismo.
 */
export default function OwnedInventoryPage() {
  const live = useLiveCatalog();
  const cards = live.publicProducts.map((p) => cardFromMirror(p, live.ownedAvailableOf(p)));

  return (
    <div>
      <div className="pb-catdesc" style={{ paddingBottom: 24 }}>
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
          <span className="pb-catdesc-eyebrow">Inventario propio</span>
          <h1 className="pbsf-serif-heading" style={{ marginBottom: 16 }}>
            Owned Inventory
          </h1>
          <p className="pb-catdesc-body">
            A diferencia del catálogo dropshipping de primebuildfit.com, todo lo que aparece en esta
            página está físicamente en nuestros almacenes: unidades contadas en un ledger de
            movimientos auditado, reservadas en tu checkout y enviadas por nosotros. Si no hay stock
            propio, el producto no se muestra — sin excepciones.
          </p>
        </div>
      </div>
      <div className="pb-products">
        <p className="pb-count">
          {live.ready ? `${cards.length} productos con stock físico propio ahora mismo` : "Cargando…"}
        </p>
        {live.ready && cards.length === 0 ? (
          <div className="pbsf-empty">
            <p>
              <strong>0 productos con stock propio en este momento.</strong> Ese cero es real: el
              inventario nace solo de recepciones físicas en el almacén.
            </p>
            <p>
              <Link href="/shop/catalog" className="pb-featured-link">
                Ver la tienda
              </Link>
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
