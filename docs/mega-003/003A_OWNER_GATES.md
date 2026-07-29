# 003A — Owner gates (no son defectos técnicos)

1. **Credenciales Shopify** (`SHOPIFY_STORE_DOMAIN`, `SHOPIFY_ADMIN_ACCESS_TOKEN`, opcional `SHOPIFY_API_VERSION`, `SHOPIFY_WEBHOOK_SECRET`): ausentes ⇒ el sync vive de snapshot etiquetado (Stale). Setup en 003G handoff (`SHOPIFY_LIVE_SYNC_SETUP.txt`).
2. **Decisión canonical/SEO** (SHOPIFY_CANONICAL | OFFICIAL_STORE_CANONICAL | SPLIT_BY_INVENTORY): paquete en 003B; nada se activa sin decisión.
3. **Enlace manual en el theme Shopify** («Available in PrimeBuild Official Store»): snippet preparado en 003B; publicación SIEMPRE manual del owner.
4. **Recepción de stock físico real**: la visibilidad pública depende de recibir stock en el Admin (política default).
5. **Proveedor financiero + dirección económica de las tasas + `pbExchangeMoneyModeEnabled`**: paquete de decisión en 003E; el validador anti-arbitraje mantiene BLOCK_PRODUCTION_ACTIVATION.
6. **Backup de claves de updater** (AP-9.3): vault preparado por la campaña Nexus (012/013); faltan USB + passphrases del owner. No se rota ninguna clave desde aquí.
7. **Proveedor IA real** para el asistente del Internal OS (modo determinista mientras tanto).
