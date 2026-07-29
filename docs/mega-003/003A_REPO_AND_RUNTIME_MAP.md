# 003A — Mapa de repos y runtime (2026-07-29)

## Ramas canónicas (tras fetch, con 5 días de sesiones paralelas integradas)

| Repo | origin canónica | HEAD | ¿Contiene PBOS-001/002? |
|---|---|---|---|
| PrimeBuild Official Store | origin/main | `afae4aa` Merge Official Store Nexus rollout | ✓ (`eb3694b` ancestro) |
| PrimeBuild Internal OS | origin/main | `c361cbf` Merge PrimeBuild Nexus rollout | ✓ (`f2dbedb` ancestro) |
| CoinOS | origin/main | `f3310e5` Merge CoinOS Nexus rollout | ✓ (`25aae0d` ancestro; rutas `/pb-exchange/*` presentes en el árbol) |
| Platform Nexus | origin/main | `acb631d` (NEXUS-011) | ✓ (`57cfb08` ancestro). Campañas 012-016 en ramas locales SIN push (gestión propia de esa campaña) |
| Partnera | origin/ci/restore-pipeline | `9347036` (reconcile PUMC+PB SDK) | ✓ |
| Eventra | origin/main | `9d705fa` (E-OGAR-006) | ✓ |

- Los worktrees de PBOS-001/002 fueron limpiados por DISK-RECOVERY-001 **tras verificar ramas en canónicas** — sin pérdida. Sobrevive `_WORKTREES/pbos-sclp-fable-002` (worktree de esta campaña, junction de node_modules reparado → install propio por la dependencia nueva `@platform-nexus/app-surface` file:vendor del rollout).

## Instalaciones reales (registro + exe)

| App | Versión instalada | Fecha exe | Estado vs main |
|---|---|---|---|
| PrimeBuild Official Store | **0.1.10** | 2026-07-24 | Detrás de main (rollout Nexus Login + campaña 003) → rebuild en 003G |
| PrimeBuild Internal OS | exe **0.1.8** (registro dice 0.1.5 — installs locales sin actualizar registro) | 2026-07-21 | **VIEJA**: sin supervisión MEGA-001 ni rollout → rebuild+install en 003G |
| CoinOS | **0.3.0** (COS-CORE-EXCHANGE-THEME, sesión paralela) | 2026-07-24 | Verificar en runtime que incluye `/pb-exchange` (003E) |
| Platform Nexus Internal OS | **0.6.10** (campaña 016, ramas sin push) | 2026-07-28 | Gestión de la campaña Nexus; esta campaña NO la toca (SAFE_STOP_UNRELATED_APP_DEPLOY) |
| PrimeBuild Core | 0.2.0 | histórico | Instalación legada pre-renombre a CoinOS. NOT_A_GAP (documentada) |

## Calidad del árbol de campaña (main afae4aa + install propio)

- typecheck limpio · **300/300 tests** (296 de PBOS-001/002 + 4 del rollout Nexus).
- Paridad del SDK PB: **hash único `1d21d2b0eb8ff3c0` en las 7 ramas canónicas** (PBOS, PBIOS, CoinOS, Nexus, Partnera ci + main, Eventra).

## Credenciales (existencia por nombre; valores jamás)

`SHOPIFY_STORE_DOMAIN` / `SHOPIFY_ADMIN_ACCESS_TOKEN` / `SHOPIFY_API_VERSION` / `SHOPIFY_WEBHOOK_SECRET`: **ausentes** en env de usuario/máquina y sin `.env` en instalación ni canónico ⇒ **WAITING_OWNER_CREDENTIALS**; certificación determinista con snapshot etiquetado (Stale).
