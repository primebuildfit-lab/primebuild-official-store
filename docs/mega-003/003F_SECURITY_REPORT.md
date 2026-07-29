# 003F — Informe de seguridad (mecanismo → evidencia)

| Vector | Mecanismo | Evidencia |
|---|---|---|
| Shopify token leak | Cliente server-only; token jamás en logs/UI; guard anti-mutación pre-red | código + auditoría PBOS-001; sin secretos en repo (gitleaks CI verde en pushes) |
| Provider secret leak | No existe proveedor; getProviderState solo devuelve estados | SDK test |
| Webhook spoof/replay | HMAC-SHA256 timingSafeEqual; el payload NUNCA escribe catálogo (solo encola reconciliación); sin secreto ⇒ 401 | código route + diseño |
| Inventory injection | Colecciones versionadas con validadores por registro; movimientos solo por flujos con reason/actor; `wouldGoNegative` | tests owned-inventory |
| Negative stock | guard §66 | test explícito |
| Duplicate reservation | idempotencyKey + transiciones legales | tests + E2E concurrencia |
| Unauthorized adjustment | acciones sensibles requieren reason/capability (catálogo §62); enforcement final = identidad Nexus (gate) | config + docs |
| Quote manipulation | precios SIEMPRE recalculados del contrato; snapshots revalidados en checkout con reconfirmación | tests store-pricing |
| Rate spoof | tasas constantes del SDK (hash único en 7 repos); ninguna entrada externa las altera | parity CSV |
| Fee bypass | STORE_PURCHASE_FEE_POLICY sellada; desglose §41 sin conceptos ocultos | tests |
| Stale settlement | Settled exige providerRef; quotes caducan | SDK tests |
| Profile confusion | perfiles paralelos inmutables; sin ruta de conversión | SDK tests |
| Cross-tenant | app single-tenant PrimeBuild; fronteras Partnera/Eventra solo por SDK vendored | arquitectura |
| Role escalation | sin auth propia (identidad Nexus = gate); mientras tanto no hay roles que escalar, solo catálogo declarativo | docs |
| XSS | sanitizeProductHtml en import Y render (scripts/iframes/on*/javascript: fuera) | test §81 |
| Prompt injection vía contenido de producto | el contenido del catálogo jamás se interpreta como instrucciones (no hay LLM en el camino; asistente determinista con fuentes citadas) | arquitectura NIA |
| Export leakage | exports masivos bloqueados (customers PBOS-001); diagnóstico redacted | PBOS-001 tests |
