# 003A — Trabajo preservado

- **PBOS-001 y PBOS-002 completos en main** (`eb3694b` ⊂ `afae4aa`): dominio, storefront clonado, mirror, SDK, evidencia visual. Nada que re-preservar.
- **Rollout Nexus (oleada 5)** integrado en main por sesiones paralelas: Nexus Login + panel vía `@platform-nexus/app-surface` (file:vendor, sin ruta absoluta) + guard de canal de release. PRESERVADO tal cual; su test (4) pasa junto a los 296 de PBOS.
- **CoinOS**: PB Exchange V1 intacto dentro de la consolidación COS-CORE (main `f3310e5`); el grupo de navegación y las 10 rutas viven en el árbol actual.
- **Worktrees ajenos**: no se tocó ninguno. El único worktree usado es `pbos-sclp-fable-002` (propio, reparado). Los checkouts canónicos con árboles sucios (iconos/branding de otras sesiones) permanecen intactos.
- **Ramas de campañas paralelas sin push (Nexus 012-016, Eventra eba-001)**: fuera del alcance; no se fusionan ni despliegan desde aquí.
