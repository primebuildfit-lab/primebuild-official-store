# PrimeBuild Official Store — Reporte de rediseño premium

**Fecha:** 2026-07-17
**Ámbito:** rediseño visual completo de la consola comercial PrimeBuild Official Store.
**Ubicación del trabajo:** `D:\empresas\WorkspaceExtra\PrimeBuildOfficialStore-Redesign` (COPIA).
**App original:** `D:\empresas\WorkspaceExtra\PrimeBuildOfficialStore` — **intacta, sin modificar**.

---

## 1. Contexto y restricciones

Se pidió convertir PrimeBuild Official Store en el **centro comercial premium** de la marca,
coherente con el ecosistema (Platform Nexus / CoinOS / Eventra / Partnera / PrimeBuild Internal OS),
manteniendo estas reglas:

- **Solo rediseño visual.** Sin nuevas funcionalidades, sin nueva lógica, sin nuevas queries a
  Shopify. Se reutilizan tal cual los servicios de lectura existentes.
- **No tocar** Shopify, APIs, PostgreSQL, Railway, auth, permisos, updater, sincronizaciones ni la
  configuración funcional de Tauri.
- **Trabajar sobre una copia**; la versión actual ("la online") no se modifica hasta aprobación.
- **Honestidad de datos:** solo lectura, sin datos inventados; se conservan los estados "tienda no
  conectada".

Todo el trabajo se hizo en la copia. La app original no recibió ni un cambio.

---

## 2. Decisiones de diseño

### Identidad — oscuro premium, bloqueado
- Tema **dark-locked por defecto** (`<html data-theme="dark">` renderizado en servidor → sin flash).
- Canvas casi-negro más profundo (`--background: #050609`) con superficies en capas
  (`surface` / `surface-muted` / `elevated` / `sidebar`) y bordes sutiles.
- **Acento comercial** único: gradiente indigo→violeta (`--gradient-accent`) para marca, hero y el
  KPI destacado; además del acento indigo semántico.
- Se añadió una **escala de elevación** (`--shadow-e1/e2/e3` + `--shadow-glow`), escala de radios y
  washes de superficie. Todo por variables semánticas → theming centralizado en `globals.css`.
- Se conserva un tema claro opcional (para el toggle) igualmente premium; nunca hay paneles claros
  por defecto.

### Iconografía
- Se sustituyeron los glifos Unicode (`▦ ▣ ◫ …`) por un **set inline-SVG estilo lucide**
  (`components/ds/icon.tsx`, 24×24, stroke, `currentColor`) — sin añadir dependencias.
- El registro de secciones (`config/sections.ts`) ahora referencia **nombres de icono** tipados
  (`IconName`), no glifos.

### Navegación reorganizada por área comercial
Antes: `Panel · Tienda · Canales y marketing · Sistema`.
Ahora: **`Panel · Catálogo · Ventas · Marketing y canales · Sistema`**, para que la consola se lea
como un centro de comando comercial. Se mantienen las **11 secciones** (sin añadir ni quitar
módulos); solo cambió su agrupación e iconos.

### Microinteracciones
- Estados completos en botones/cards/chips: hover / active / focus-visible / pressed / disabled /
  loading.
- Keyframes nuevos: `core-rise` (entrada), `core-shimmer` (skeleton), `core-spin` (spinner), más el
  `core-pulse` existente. Todo respeta `prefers-reduced-motion`.

### Dashboards sin "panel tradicional"
- HOME prioriza **hero + fila de KPIs + accesos por área + nota honesta**; las tablas nunca dominan
  (viven en la misma superficie Card, con header sticky y hover calmado).

---

## 3. Librería de componentes — `src/components/ds/` (copy-ready)

Capa de Design System autocontenida (solo depende de `@/lib/cn`), pensada para copiarse al resto del
ecosistema:

| Componente | Archivo | Origen |
|---|---|---|
| `Icon` (+`IconName`, `isIconName`) | `ds/icon.tsx` | **nuevo** |
| `Button` (variantes/tamaños/loading) | `ds/button.tsx` | **nuevo** |
| `Card` (+ `interactive`/`elevated`) | `ds/card.tsx` | evoluciona `ui/card` |
| `Badge` + `Chip` | `ds/badge.tsx` | evoluciona `ui/badge` |
| `StatusDot` | `ds/status-dot.tsx` | **nuevo** |
| `Spinner` / `Skeleton` / `SkeletonRows` | `ds/feedback.tsx` | **nuevo** |
| `Panel` | `ds/panel.tsx` | **nuevo** |
| `PageHeader` | `ds/page-header.tsx` | evoluciona `os/page-header` |
| `KpiCard` + `TrendDelta` | `ds/kpi-card.tsx` | evoluciona `os/stat-tile` |
| `Sparkline` / `MiniBars` / `DonutStat` | `ds/charts.tsx` | **nuevo** (SVG, solo datos reales) |
| `DataTable` (+ `caption`) | `ds/data-table.tsx` | evoluciona `os/data-table` |
| `StoreNotConnected` / `NoData` | `ds/empty-state.tsx` | evoluciona `os/empty-state` |
| `SegmentedControl` | `ds/tabs.tsx` | **nuevo** |
| `Modal` | `ds/modal.tsx` | **nuevo** |
| `SearchInput` / `Toolbar` | `ds/search-input.tsx` | **nuevo** |
| barrel `index.ts` | `ds/index.ts` | **nuevo** |

La composición del **shell** específica de la app permanece en `components/os/`
(`os-shell`, `os-sidebar`, `os-topbar`, `os-command-palette`, `module-header`, y el nuevo
`theme-toggle`), construida sobre los primitivos de `ds/`.

### Componentes eliminados (dead code)
Se borraron los superados, migrados a `ds/`: `os/page-header`, `os/stat-tile`, `os/data-table`,
`os/empty-state`, `ui/card`, `ui/badge` (y el directorio `ui/` vacío). Sin duplicación ni CSS muerto.

---

## 4. Sobre el "Design System compartido" (importante)

**No existe** un paquete de design-system que las apps del ecosistema importen. Nexus, CoinOS,
Internal OS y Official Store son **repos independientes** que comparten el lenguaje visual
**copiando** los mismos componentes + tokens (Official Store se extrajo de Internal OS con un set de
componentes idéntico). Por eso "añadir al DS compartido" no es literal sin crear infraestructura
cross-repo, lo cual **tocaría otras apps** (fuera de alcance).

**Enfoque adoptado:** `src/components/ds/` es una capa limpia, semántica y **copy-ready**. Próximo
paso real para compartir de verdad → extraer `ds/` + `globals.css` a un paquete
`@primebuild/design-system` en un monorepo o repo publicable, y que cada app lo consuma. Ese paso es
un cambio de infraestructura que debe planificarse aparte.

---

## 5. Cambios por pantalla (solo visual, datos intactos)

- **HOME** (`app/(dashboard)/page.tsx`): hero comercial con identidad de tienda + estado de conexión;
  4 KPIs premium (Productos, Clientes, Pedidos recientes, Ingresos recientes) con valores honestos
  (`—` si no hay tienda); accesos rápidos agrupados por área; nota de honestidad. Usa **solo**
  `storeOverview()`.
- **Módulos de tabla** (products, collections, orders, customers, discounts): `DataTable` premium con
  header sticky, badges semánticos y caption con recuento. Mismos datos y estados.
- **Store (Resumen)**: KPIs + `Panel` de ficha + accesos a subpáginas con iconos.
- **PB Coins / Settings / Status**: `Panel` + `StatusDot` + definición honesta de conexión.
- **Canales**: hub premium de marketing/canales con icono por canal y enlaces al panel de Shopify;
  sin métricas inventadas.
- **Shell**: sidebar con marca en gradiente, rail activo e iconos SVG; topbar con buscador,
  pill de conexión y **toggle de tema**; command palette restyleada.

---

## 6. Verificación (ejecutada en la copia)

| Paso | Resultado |
|---|---|
| `pnpm typecheck` | ✅ 0 errores |
| `pnpm lint` | ✅ 0 errores/warnings |
| `pnpm test` (vitest) | ✅ 10/10 (2 archivos) |
| `pnpm build` (next) | ✅ 13 rutas compiladas |
| `cargo check` (src-tauri) | ✅ compila, 0 errores |
| `pnpm tauri build` (NSIS) | ✅ instalador generado: `PrimeBuild Official Store_0.1.0_x64-setup.exe` (35.5 MB) |
| Revisión runtime (dev) | ✅ todas las rutas 200, **0 errores de consola**, estados "no conectado" honestos |

Nota de test: se ajustó una aserción en `tests/config/sections.test.ts` que referenciaba el grupo
`"Tienda"` (renombrado). El invariante se preservó comprobando que las secciones con id `store*`
viven bajo `/store`.

---

## 7. Riesgos y próximos pasos

- **Promover la copia a definitiva:** cuando apruebes, reemplazar el contenido de
  `PrimeBuildOfficialStore` por el de `-Redesign` (o renombrar carpetas). El identificador Tauri
  (`com.primebuild.store`), updater, sidecar y config funcional no se tocaron, así que el swap es
  directo.
- **Tienda no conectada en la copia:** la copia no tiene `.env` con credenciales, por lo que las
  pantallas muestran el estado honesto vacío — comportamiento correcto y esperado.
- **DS realmente compartido:** pendiente el paso de empaquetado `@primebuild/design-system` (sección
  4), a planificar aparte porque afecta a varios repos.
- **`tauri build`:** ejecutado con éxito sobre la copia. Instalador en
  `src-tauri/target/release/bundle/nsis/`. **No se instaló** — solo se generó, para no interferir con
  la app instalada actual (mismo identificador `com.primebuild.store`).
- **Comprobado:** el árbol original `PrimeBuildOfficialStore\src` no tiene ningún archivo modificado
  después de crearse la copia — la app original quedó intacta.
