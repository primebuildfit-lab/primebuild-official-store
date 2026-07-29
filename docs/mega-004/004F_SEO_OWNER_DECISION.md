# 004F — SEO owner decision

Paquete base: docs/mega-003/003B_SEO_DECISION_PACKET.md. Ampliación 004:

- **SHOPIFY_CANONICAL**: sin riesgo de duplicado; sitemap solo Shopify;
  structured data ya emitido en el clon (JSON-LD Product); sin redirects.
- **OFFICIAL_STORE_CANONICAL**: exige dominio público + sitemap/robots propios
  + redirects 301 por producto desde Shopify — mayor esfuerzo y riesgo.
- **SPLIT_BY_INVENTORY**: canonical dinámico según stock propio; sitemap
  dividido; riesgo medio de inconsistencia si el stock oscila.

**Default seguro si no decides: SHOPIFY_CANONICAL.** Nada queda activado.
