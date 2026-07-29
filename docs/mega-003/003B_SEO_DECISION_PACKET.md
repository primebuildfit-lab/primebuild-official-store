# 003B — Paquete de decisión SEO/canonical (para el owner)

Nada se activa sin tu decisión. Opciones preparadas:

## 1. SHOPIFY_CANONICAL (recomendada mientras Shopify sea el canal principal)
- `rel=canonical` de cada PDP del clon apunta a `primebuildfit.com/products/<handle>`.
- Evita contenido duplicado; la Official Store no compite en buscadores.
- Coste: el clon no posiciona por sí mismo.

## 2. OFFICIAL_STORE_CANONICAL
- Canonical propio; exige dominio público propio + sitemap/robots propios.
- Solo tiene sentido si la Official Store se publica en la web (hoy es app de escritorio).

## 3. SPLIT_BY_INVENTORY
- Productos con stock propio → canonical Official Store; resto → Shopify.
- Máximo valor a largo plazo, más complejidad (canonical dinámico por producto).

Estado actual implementado: JSON-LD Product en PDP (precio VN observable);
sin canonical/sitemap hasta decisión. Cuando decidas, la implementación es
1 archivo (generateMetadata + sitemap route).
