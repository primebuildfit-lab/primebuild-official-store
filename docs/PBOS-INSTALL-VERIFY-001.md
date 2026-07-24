# PBOS-INSTALL-VERIFY-CORRECTIVE-001 — Build e instalación local

## Clasificación final: **A**

PrimeBuild Official Store **completamente construido, instalado y verificado**. La
aplicación instalada (v0.1.5) sirve la totalidad de este trabajo (32/32 rutas). No
hubo push, release público, despliegue ni publicación Shopify — solo build e
instalación local.

## Pre-checks (antes de empaquetar)

- typecheck ✓ · lint ✓ · suite JS **196 tests** ✓ · `next build` ✓
- `cargo check` ✓ (implícito) · `cargo test` ✓ (**3 tests**, `updater.rs`)
- árbol limpio ✓ · auditoría de secretos: sin secretos en `src`/`src-tauri` (solo
  `.env.example` versionado) · Shopify no modificado ✓

## Empaquetado

- Versión: **0.1.4 → 0.1.5** (patch) sincronizada en `package.json`,
  `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` vía `version-sync.mjs`.
- Conservados: identifier `com.primebuild.store`, productName `PrimeBuild Official
  Store`, updater (pubkey `71F1CFC47554874F`), canal (definido en
  `updater-channel.json`), claves y repositorio de releases — sin cambios.
- `tauri build` → NSIS producido **sin firma** (no se generan updater-artifacts, no
  se requirió la clave privada): compilación release 3m59s + makensis.
- Instalador: `PrimeBuild Official Store_0.1.5_x64-setup.exe` (~25.8 MB).

## Instalación y verificación

- **Backup previo:** `D:\empresas\_BACKUPS\pbos-official-store-preinstall-20260721-005010`
  (instalación 0.1.2 + `com.primebuild.store` config/localStorage).
- Instalación silenciosa (`/S`, currentUser); reemplazó la 0.1.2 previa.
- **Ejecutable instalado:** `%LOCALAPPDATA%\PrimeBuild Official Store\primebuild-store-desktop.exe`
  · ProductVersion **0.1.5** (no un exe de `target/release`).
- Acceso directo: `Start Menu\Ecosistema\PrimeBuild\PrimeBuild Official Store.lnk`
  → el exe instalado.
- Abierto desde el acceso directo: **PID principal** único, **sidecar Node** (hijo)
  sirviendo en un puerto local; `/api/health` = `healthy`, `storeConnected:false`.
- **Recorrido instalado: 32/32 rutas sirvieron 200** desde el sidecar de la app
  instalada, incluidas las correctivas `/sales/drafts` y `/operations/quality`.
- Cerrar y reabrir: la app reabre con un solo proceso y `health` `healthy`; el
  directorio de datos locales `com.primebuild.store` persiste.

## Caveats

- **Single-instance:** bajo automatización headless el resultado fue inconsistente
  (snapshots de 0, 1 y 2 procesos); **en ningún caso quedaron dos instancias
  persistentes** tras estabilizar, pero no pudo afirmarse de forma definitiva
  headless porque los procesos se autocierran en esta sesión no interactiva.
- **Versión de UI vs instalador:** `/api/health` reporta `version: 0.1.0` (la
  constante `app.version` de la UI, no mantenida en sincronía), mientras el
  ejecutable/instalador es **0.1.5** (verificado en el exe). Discrepancia cosmética;
  no afecta la clasificación.

## EAL-001

- No se modificó su rama ni worktree. El ejecutable instalado conserva identifier
  `com.primebuild.store` y ruta esperada `%LOCALAPPDATA%\PrimeBuild Official Store\`
  para que EAL/Nexus lo abran cuando su launcher esté disponible; el enlace
  transversal queda pendiente separado.

## Sin efectos remotos

Sin push, release, despliegue, publicación, migraciones live, OAuth, webhooks,
cambios en Shopify/inventario remoto/proveedores. Instalación **local** únicamente.
