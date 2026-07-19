# PrimeBuild Official Store

**The official administration console for the PrimeBuild (primebuildfit) Shopify store.**

PrimeBuild Official Store is an **independent** application that belongs **only to
PrimeBuild**. It is a **read-only** live view of the `primebuildfit` storefront
(Shopify):

- **Panel** — a live snapshot of the store (products, customers, recent orders, revenue).
- **Tienda** — Resumen, Productos, Colecciones, Pedidos, Clientes, Descuentos and the PB Coins rewards program.
- **Canales y marketing** — an honest overview of external sales channels (Google Merchant, Meta, Pinterest, SEO, apps) that links out to the Shopify admin.
- **Sistema** — connection/environment settings and live status.

It is its own app. The store-management surface used to live inside PrimeBuild
Internal OS; it was extracted into this dedicated console.

Three neighbouring systems are easy to confuse with it, and with each other:

| System | What it is | Relationship to this app |
|---|---|---|
| **PrimeBuild Internal OS** | The internal operations console for the PrimeBuild brand — company, not store | Separate app. It links out to this one |
| **CoinOS** | The group's financial-infrastructure OS. **Formerly named PrimeBuild Core** — the name changed, the system did not | Unrelated |
| **`priembuild-core`** | The live Shopify rewards backend behind `primebuildfit.com`. Despite the similar name, **it is not CoinOS** | Unrelated. This console reads the PB Coins programme it powers, read-only |

This console is also **not** Eventra and **not** Partnera.

It runs both as a **web app** and as a **native Windows desktop app** (Tauri 2),
which can **rebuild itself automatically** via the auto-rebuild pipeline
(`pnpm desktop:auto`).

## Honesty & safety

Nothing here fabricates data. When the store is not connected, every screen shows
an explicit "store not connected" state — never fake products, orders or revenue.
The Admin client **refuses any GraphQL mutation** before it ever reaches the
network, so this console is strictly **read-only** against the live store, and the
access token is never logged or shown.

## Connect the store (optional)

Create a `.env` with a **read-only** Shopify Admin API token:

```
SHOPIFY_STORE_DOMAIN="primebuildfit.myshopify.com"
SHOPIFY_ADMIN_ACCESS_TOKEN="shpat_********"
SHOPIFY_API_VERSION="2025-01"   # optional
```

In the packaged desktop app, these same variables are read from the process
environment and forwarded to the bundled local server (never bundled or
hardcoded).

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Run the web app in development |
| `pnpm build` | Production web build |
| `pnpm typecheck` / `pnpm lint` / `pnpm test` | Quality gates |
| `pnpm desktop:dev` | Run the Tauri desktop app (live reload) |
| `pnpm desktop:build` | Build the desktop app once |
| `pnpm desktop:auto` | **Auto-rebuild**: watch source and regenerate the NSIS installer on every change |
| `pnpm desktop:auto:once` | Build a single installer and exit |

The desktop app bundles a Node sidecar that runs the standalone Next server
locally in a dedicated window and reads the live store over HTTPS. There is no
local database.
