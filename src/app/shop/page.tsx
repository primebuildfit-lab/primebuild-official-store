"use client";

import {
  BentoCategoryGrid,
  CategoryDescriptions,
  FeaturedStrip,
  HeroSection,
} from "@/components/shop/storefront-sections";
import { STOREFRONT_HOME_STRIPS } from "@/config/storefront-menu";
import { cardFromMirror, mirrorProductsInCollection } from "@/lib/mirror-card";
import { useLiveCatalog } from "@/lib/official-store-data";

/**
 * Home del storefront (PBOS-SCLP-FABLE-002): clon del templates/index.json del
 * theme «Primebuild 1.1» — hero de vídeo, «Shop by collection» (bento), cuatro
 * franjas de productos destacados con heading serif y las descripciones de
 * categoría. Las franjas se alimentan del mirror EN VIVO filtrado por la
 * política de visibilidad (§12-§13): sin stock físico propio, el default
 * honesto muestra el estado vacío, nunca inventario del proveedor.
 */
export default function ShopHomePage() {
  const live = useLiveCatalog();

  return (
    <div>
      <HeroSection />
      <BentoCategoryGrid />
      {!live.ready ? (
        <p className="pbsf-empty">Cargando catálogo…</p>
      ) : live.mirrorProducts.length === 0 ? (
        <div className="pbsf-empty">
          <p>
            <strong>El espejo del catálogo está vacío.</strong>
          </p>
          <p>
            Ejecuta una sincronización o carga el snapshot desde el Admin (Tienda online → Espejo
            del catálogo) para ver el catálogo activo de Shopify aquí.
          </p>
        </div>
      ) : live.publicProducts.length === 0 ? (
        <div className="pbsf-empty">
          <p>
            <strong>
              {live.mirrorProducts.length} productos activos espejados — ninguno público todavía.
            </strong>
          </p>
          <p>
            La política {live.policy?.mode} solo publica productos con stock físico propio
            disponible. Recibe stock en el Admin para publicarlos.
          </p>
        </div>
      ) : (
        <>
          {STOREFRONT_HOME_STRIPS.map((strip) => {
            const col = live.collections.find((c) => c.handle === strip.collection);
            const items = mirrorProductsInCollection(
              live.publicProducts,
              strip.collection,
              col?.ruleTag,
            ).map((p) => cardFromMirror(p, live.ownedAvailableOf(p)));
            return (
              <FeaturedStrip
                key={strip.collection}
                heading={strip.heading}
                viewAllHref={strip.viewAll}
                products={items}
              />
            );
          })}
        </>
      )}
      <CategoryDescriptions />
    </div>
  );
}
