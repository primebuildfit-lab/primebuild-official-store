# 004F — SHOPIFY_LIVE_SYNC_OWNER_ACTIONS

Estado: WAITING_OWNER_SHOPIFY_CREDENTIALS (verificado por nombre 2026-07-29).

1. **Least privilege**: app privada con SOLO `read_products` (el cliente tiene
   guard anti-mutación; jamás pediremos write).
2. Variables de entorno DE USUARIO (no repo, no chat): `SHOPIFY_STORE_DOMAIN`,
   `SHOPIFY_ADMIN_ACCESS_TOKEN` (+opcional `SHOPIFY_API_VERSION`).
3. Reinicia la app → Sync Center → **Run full sync** → estado `Synced`.
4. Incremental: botón Incremental (updated_at desde el último sync).
5. Reconciliación: botón Reconcile (detecta retirados/perdidos; nada se borra).
6. **Rollback**: el mirror es un archivo (`.data/mirror-store.json` bajo la
   instalación); para volver al snapshot: botón «Cargar snapshot real» (pisa
   por el mismo pipeline y queda Stale). Borrar el archivo = mirror vacío
   honesto. Las credenciales se retiran quitando las variables de entorno.
7. **Frontera de no-escritura**: ninguna ruta de la app muta Shopify; el guard
   del cliente rechaza mutaciones antes de red.
