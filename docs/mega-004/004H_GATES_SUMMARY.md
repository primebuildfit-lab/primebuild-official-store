# 004H — Gates WAITING_OWNER al cierre de la campaña

Ningún gate se marcó cerrado esta noche. Todos requieren acción humana de Brian
(las credenciales se citan SOLO por nombre, nunca por valor):

| Gate | Qué falta | Dónde retomarlo |
|---|---|---|
| WAITING_OWNER_SHOPIFY_CREDENTIALS | `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_ADMIN_API_TOKEN`, `PBOS_WEBHOOK_SECRET` en el runtime instalado | docs/mega-004/004F_SHOPIFY_SETUP.md |
| WAITING_OWNER_FIRST_REAL_STOCK | recibir stock físico real con el wizard (hoy solo existe el dry-run DEMO etiquetado) | docs/mega-004/004E_FIRST_STOCK_GUIDE.md |
| WAITING_OWNER_SEO_CANONICAL | elegir estrategia SEO/canonical entre tienda Shopify y /shop | docs/mega-004/004F_SEO_OWNER_DECISION.md |
| WAITING_OWNER_THEME_LINK | pegar el enlace del theme manualmente (jamás publicación automática) | docs/mega-004/004F_THEME_LINK_PACKET.md |
| WAITING_OWNER_PB_RATE_DIRECTION | decisión de dirección del rate PB (BLOCK_PRODUCTION_ACTIVATION vigente) | docs/mega-003/003E (sin cambios en π / 3.1 / 1%) |
| WAITING_OWNER_VISIBILITY_POLICY | pasar a ALL_ACTIVE_PRODUCTS exige `PBOS_VISIBILITY_OWNER_CONFIRMED=yes` | src/config/visibility-policy.ts |
| WAITING_OWNER_PUBLIC_LAUNCH | publicar el storefront fuera de localhost (hoy todo es local/beta) | PRIMEBUILD_NIGHT_FINAL_004.md |

Prohibiciones intactas: sin dinero real, supplier stock nunca convertido en
owned, theme nunca publicado automáticamente, logo aprobado sin sustituir.
