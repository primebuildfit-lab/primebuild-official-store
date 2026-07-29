# 003A — Registro de gaps

| # | Hallazgo | Clase | Evidencia | Acción |
|---|---|---|---|---|
| G1 | Internal OS instalado (0.1.8, 2026-07-21) NO sirve la supervisión Official Store de MEGA-001 ni el rollout («Internal OS sirviendo UI vieja») | **MAJOR** | exe 0.1.8 < main `c361cbf` | 003G: bump+build+install+verify |
| G2 | Registro de desinstalación PBIOS dice 0.1.5 con exe 0.1.8 (installs locales `--no-sign` no actualizan registro) | MINOR | registry vs VersionInfo | Se corrige solo con el NSIS de 003G |
| G3 | CoinOS instalado 0.3.0 construido por sesión paralela: confirmar en runtime que incluye `/pb-exchange/*` | VERIFY→(cerrado en 003E) | árbol de main lo contiene; falta prueba runtime | 003E: sonda de rutas |
| G4 | Fallo preexistente `updater-channel.test` en PBIOS (documentado desde PAM/NIA-IOS) | MAJOR (investigar, no ignorar) | suite PBIOS | 003D: diagnóstico y fix o registro justificado |
| G5 | Junction de node_modules del worktree roto por la limpieza de disco | MINOR (entorno) | reparado con install propio | Cerrado en 003A |
| G6 | Rollout añadió dep `@platform-nexus/app-surface` (file:vendor) — los checkouts con node_modules viejos no typecheckean | MINOR (entorno) | TS2307 antes del install | Cerrado (install propio); documentado para futuros worktrees |
| G7 | Credenciales Shopify ausentes | DEFERRED_OWNER | nombres verificados ausentes | WAITING_OWNER_CREDENTIALS |
| G8 | Claves de updater sin backup verificado (AP-9.3); campaña NEXUS-012/013 ya inventarió 16 claves y preparó vault, faltan USB+passphrases | DEFERRED_OWNER | memorias 012/013 | Owner gate (no rotar, no tocar) |
| G9 | «PrimeBuild Core 0.2.0» instalación legada pre-CoinOS | NOT_A_GAP | histórica, no interfiere | Documentada |
| G10 | Nexus instalado 0.6.10 desde ramas sin push (campaña 016 propia) | NOT_A_GAP (fuera de alcance) | memoria 016 | No tocar (SAFE_STOP_UNRELATED_APP_DEPLOY) |

## Riesgos auditados SIN hallazgo (mecanismo + test en verde)

- Snapshot presentado como live → imposible: `importSnapshot` fuerza estado `Stale`; test `mirror-sync` + UI Sync Center lo etiqueta.
- Productos sin stock visibles → política default `ACTIVE_AND_OWNED_STOCK` enforceada (tests `storefront-clone`; runtime 0.1.10 verificado el 07-24 con ownerConfirmed=False y 0 públicos).
- Supplier stock contaminando available → `available` deriva SOLO del ledger por SKU; el espejo no aporta stock (tests owned-inventory + officialFromMirror sin observedSupplierStock).
- Descuento duplicado → `calculateStorePrice` aplica una vez (tests SDK + store-pricing: 24.99→22.49, «no 81»).
- Quote stale en checkout → revalidación con reconfirmación (tests store-pricing).
- Paid/Refunded sin provider → `transitionOrder` exige evidencia (tests storefront).
- Fast shipping sin SLA → `fastShippingVerdict` exige las 6 condiciones (tests owned-inventory).
- PB profile confusion → perfiles separados e inmutables desde SDK (tests parity ×7 repos).
- Rutas huérfanas/botones sin acción → 7/7 rutas nuevas verificadas en la instalada 0.1.10; Sync Center con acciones reales contra APIs locales.
