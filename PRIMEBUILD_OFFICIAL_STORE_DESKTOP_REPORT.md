> **⚠️ REGISTRO HISTÓRICO — la definición que usa quedó superada.**
>
> Este informe describe la extracción de la app desde Internal OS y la llama
> «read-only administration console». Esa era la definición vigente el
> 2026-07-17 y **ya no lo es**.
>
> Por decisión del propietario (`PB-BLD-001`), PrimeBuild Official Store es el
> **Product Builder** del canal comercial de PrimeBuild, y PrimeBuild Store es el
> producto que se construye desde él, no un proyecto independiente.
>
> Los hechos técnicos de este informe siguen siendo válidos; su definición
> arquitectónica no. Definición vigente:
> [`docs/architecture/PRODUCT_BUILDER.md`](./docs/architecture/PRODUCT_BUILDER.md).

# PrimeBuild Official Store — Desktop App Report

**Date:** 2026-07-17
**Status:** Independent Tauri app created, compiles, and all Shopify functionality extracted from PrimeBuild Internal OS.

---

## 1. Summary

`PrimeBuild Official Store` is a **new, independent** Tauri 2 + Next.js 15 desktop
application whose sole purpose is to be the **read-only administration console**
for the PrimeBuild (`primebuildfit`) Shopify store. All store-management
functionality that previously lived as a section inside **PrimeBuild Internal OS**
was migrated here; Internal OS now keeps only its internal modules and links out
to this app.

| Field | Value |
| --- | --- |
| productName | `PrimeBuild Official Store` |
| identifier | `com.primebuild.store` |
| npm package | `primebuild-official-store` |
| Rust crate | `primebuild-store-desktop` (lib `primebuild_store_desktop_lib`) |
| version | `0.1.0` |
| Location | `D:\empresas\WorkspaceExtra\PrimeBuildOfficialStore` |

It belongs **only to PrimeBuild** — it is not CoinOS, not PrimeBuild Internal OS,
not PrimeBuild Core, not Eventra, not Partnera.

---

## 2. Location / path decision

The prompt suggested `apps/official-store-desktop` (a monorepo layout). **The
PrimeBuild ecosystem is not a monorepo**: each app (PrimeBuildInternalOS,
PrimeBuildAnalytics, PrimeBuildCore, …) is a standalone folder under
`D:\empresas\WorkspaceExtra\`. To match that convention, the new app is a
standalone sibling folder:

```
D:\empresas\WorkspaceExtra\
  ├─ PrimeBuildInternalOS      (existing — store surface removed)
  └─ PrimeBuildOfficialStore   (NEW — this app)
```

Rationale: consistency with the ecosystem, independent git/build/release, and no
shared `package.json`/workspace to couple the two apps.

---

## 3. Architecture

Identical shape to the ecosystem desktop apps (proven pattern reused from Internal OS):

- **Web app:** Next.js 15 (App Router, React 19, Tailwind 4), dark-first design
  system. Server Components read the live store; nothing is fabricated.
- **Store integration:** `src/server/integrations/store/` — a **read-only**
  Shopify Admin GraphQL client with a hard mutation guard, honest
  "not connected" degradation, and a 10s timeout. The access token is never
  logged.
- **Desktop shell:** Tauri 2 (Rust) wraps the app in a native Windows window. In
  production it boots a bundled **standalone Next server** via a **bundled Node
  sidecar** on `127.0.0.1`, shows a splash, waits for `/api/health`, then loads
  the app. External links open in the system browser; only local content loads
  in-window. No database.
- **Distribution:** deny-by-default capabilities, Rust-driven updater
  (`tauri-plugin-updater`), technical update panel, auto-rebuild + guarded
  release pipeline. Updater endpoint is an intentional placeholder
  (`OWNER/REPO`) — nothing is invented.

---

## 4. Reused code (copied from Internal OS, then rebranded)

The whole desktop machinery was reused rather than reinvented:

- Rust shell: `src-tauri/src/{lib,main,runtime,related,updater,dist,logging}.rs`,
  `build.rs`, `Cargo.toml`, `tauri.conf.json`, `tauri.release.conf.json`,
  `dist.config.json`, `capabilities/default.json`, icons, `ui/index.html`
  (splash) + `ui/updater.html` (update panel).
- Desktop scripts: `scripts/desktop/{prepare-server,auto-rebuild,version-sync,release}.mjs`.
- Web shell + UI: `components/os/*`, `components/ui/*`, `styles/globals.css`,
  config/build files (`tsconfig`, `eslint`, `vitest`, `next.config`, `.npmrc`, …).
- **Store integration** (`src/server/integrations/store/*`) and the store pages
  were migrated verbatim (see §6).

All identity strings, log filenames, window titles, package/crate names and the
desktop build flag were rebranded (`PBIOS_DESKTOP_BUILD` → `PBOS_DESKTOP_BUILD`,
`com.primebuild.internalos` → `com.primebuild.store`, etc.).

---

## 5. New code (written for this app)

- **`src/app/api/health/route.ts`** — a real `/api/health` endpoint. The Rust
  shell polls it to know when the local server is ready. (Internal OS lacked this
  route even though its shell probed for it; the new app fixes that.) It makes no
  external calls, so readiness never depends on the network.
- **Collections module** — `store.service.ts#listCollections` + `/store/collections`.
- **Discounts module** — `store.service.ts#listDiscounts` + `/store/discounts`
  (covers code + automatic discounts).
- **Sales channels & marketing** — `/channels`: an honest overview of Google
  Merchant, Meta, Pinterest, SEO and installed apps. It does **not** fabricate
  metrics; it explains each channel and deep-links to the Shopify admin.
- New section registry (`config/sections.ts`) reshaped into a store console:
  **Panel / Tienda / Canales y marketing / Sistema** (11 sections).
- `runtime.rs` now forwards the **Shopify** env vars (`SHOPIFY_STORE_DOMAIN`,
  `SHOPIFY_ADMIN_ACCESS_TOKEN`, `SHOPIFY_API_VERSION`) to the bundled server
  instead of the (irrelevant) database vars the Internal OS shell forwarded.

The two new GraphQL queries were **validated against the live Shopify Admin
schema** (`validate_graphql_codeblocks`) before use; `codeDiscountNodes` was
replaced with the non-deprecated `discountNodes`.

---

## 6. Migrated components (from Internal OS)

| From Internal OS | To Official Store |
| --- | --- |
| `server/integrations/store/{config,shopify-client,load,store.service}.ts` | migrated verbatim (read-only client + service) |
| `app/(dashboard)/store/page.tsx` (Resumen) | `/store` |
| `app/(dashboard)/store/products/page.tsx` | `/store/products` |
| `app/(dashboard)/store/orders/page.tsx` | `/store/orders` |
| `app/(dashboard)/store/customers/page.tsx` | `/store/customers` |
| `app/(dashboard)/store/rewards/page.tsx` (PB Coins) | `/store/rewards` |
| Dashboard store snapshot | `/` (dashboard) |
| `StoreSourceBadge` / `StoreNotConnected` | reused as-is |

Internal-OS-only pages (operations, links, notes) were **not** copied here.

---

## 7. Environment variables

Read-only Shopify Admin credentials (optional — without them the app shows an
honest "store not connected" state everywhere):

```
SHOPIFY_STORE_DOMAIN="primebuildfit.myshopify.com"
SHOPIFY_ADMIN_ACCESS_TOKEN="shpat_********"   # READ-ONLY token
SHOPIFY_API_VERSION="2025-01"                 # optional
```

In the packaged desktop app these are read from the process environment and
forwarded to the bundled server by `runtime.rs` (never bundled or hardcoded).

---

## 8. Security

- **Read-only:** the Admin client refuses any GraphQL `mutation` before it ever
  reaches the network (`assertReadOnly`).
- **Token safety:** the token is never logged (Rust shell logger + server log
  both exclude it) and never shown in the UI.
- **No arbitrary shell / no external nav in-window:** navigation is restricted to
  loopback + Tauri internal hosts; external links open in the system browser;
  non-web schemes are blocked.
- **Deny-by-default capabilities:** the web layer gets only `core:default`; the
  updater/opener/shell/window-state plugins are driven exclusively from Rust.
- No new integration, OAuth flow, app install, API key, secret or webhook was
  created or regenerated. Existing Shopify credentials are consumed as-is.

---

## 9. PrimeBuild Internal OS after extraction

Internal OS was reduced to its internal cockpit and no longer manages the store:

- Deleted: `app/(dashboard)/store/**` and `server/integrations/store/**`.
- Section registry reduced to **Panel / OS Interno / Sistema** (6 sections; store
  group removed).
- Dashboard, Operaciones, Accesos, Configuración and Estado reworked to drop all
  store dependencies; the topbar store pill was replaced with a neutral marker.
- Accesos/dashboard/settings now point users to the separate **PrimeBuild
  Official Store** app for store management.
- Store integration test removed; section test updated.
- `.env.example` + README updated (Internal OS now needs no env vars).

Internal OS remains fully green (see §10). Nothing else (CoinOS, Eventra,
Partnera, Platform Nexus) was touched.

---

## 10. Tests & verification

### PrimeBuild Official Store (new app)
- `pnpm typecheck` — ✅ pass
- `pnpm lint` — ✅ pass
- `pnpm test` — ✅ 10/10 (section registry + read-only store contract)
- `pnpm build` — ✅ 13 routes (incl. `/api/health`, `/channels`, `/store/collections`, `/store/discounts`)
- Runtime smoke test (`pnpm start`): `/api/health` → `{"status":"healthy", storeConnected:false}`; every page 200 with the honest "store not connected" state (login/Shopify-connection/token-invalid/disconnected all resolve to the honest states as designed).
- `cargo check` (desktop shell) — ✅ pass
- `cargo` release build (LTO) — ✅ built `primebuild-store-desktop.exe` (5.9 MB) in 8m15s
- `pnpm desktop:build` (NSIS installer) — ✅ produced `PrimeBuild Official Store_0.1.0_x64-setup.exe` (35.5 MB) at `src-tauri/target/release/bundle/nsis/` (unsigned; `beforeBuildCommand` rebuilt the standalone server + staged the Node sidecar)

### PrimeBuild Internal OS (after extraction)
- `pnpm typecheck` — ✅ pass (exit 0)
- `pnpm lint` — ✅ pass
- `pnpm test` — ✅ 7/7
- `pnpm build` — ✅ 6 routes, no store routes

---

## 11. Blockers / notes

- **Updater endpoint** is a deliberate placeholder (`github.com/OWNER/REPO/...`)
  in `tauri.conf.json` + `dist.config.json`. Signed releases require a real
  endpoint + `TAURI_SIGNING_PRIVATE_KEY` — a human-only step. `pnpm desktop:build`
  produces an **unsigned** installer; `pnpm desktop:release` handles signing.
- **Live-data verification** could not be run end-to-end because the app was built
  with no Shopify credentials in `.env` (by design — no secrets copied). The
  read-only queries were validated against the live Admin **schema** instead.
- No deploy, no release publish, no production change was performed.

---

## 12. Next steps (human)

1. Add the read-only Shopify token to this app's `.env` and confirm live data on
   `/store`, products, collections, orders, customers, discounts.
2. Initialise git / first commit for the new app folder (not done — no commit
   requested).
3. When ready to ship: set a real updater endpoint + signing key and run
   `pnpm desktop:release`, then publish the GitHub Release.
4. Optionally register a `primebuild-store://` URL scheme so Internal OS can open
   this app directly (the Rust `related.rs` target is already scaffolded).
