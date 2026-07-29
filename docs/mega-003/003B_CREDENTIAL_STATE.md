# 003B — Estado de credenciales

**WAITING_OWNER_CREDENTIALS.**

Verificado por NOMBRE (jamás valores, ni en chat/logs/repo/navegador):
- `SHOPIFY_STORE_DOMAIN` — ausente (User/Machine env; sin .env en instalación ni canónico)
- `SHOPIFY_ADMIN_ACCESS_TOKEN` — ausente
- `SHOPIFY_API_VERSION` — ausente (opcional; el cliente usa default)
- `SHOPIFY_WEBHOOK_SECRET` — ausente (webhook responde 401 honesto)

Consecuencia: full/incremental/reconciliación responden `Authentication required`
y el catálogo opera con el **snapshot etiquetado (Stale)** por el mismo pipeline.
Setup del owner documentado en el handoff (003G).
