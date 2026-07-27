# vendor/ — artefactos versionados de terceros internos

## `@platform-nexus/app-surface`

| Campo | Valor |
|---|---|
| Artefacto | `platform-nexus-app-surface-0.1.1.tgz` |
| Versión | 0.1.1 |
| SHA-256 | `d1741e9fc63aa81bb8d37b55e6c57f4a58c9daa559c2b0c2c74388ce07400a7c` |
| Origen | repo `platform-nexus`, `packages/app-surface` (fuente única del contrato cross-app) |
| Construido con | `pnpm exec tsc -p packages/app-surface/tsconfig.json && pnpm pack` |

### Por qué está aquí
La dependencia debe resolverse en un **checkout limpio** sin rutas absolutas de una
máquina concreta (ORDER-007 §7). El artefacto se referencia con una ruta
**relativa al repositorio**, de modo que `git clone` + install funciona sin
preparar nada más. El paquete no se copia archivo a archivo: sigue siendo un
único artefacto versionado; los contratos y componentes NO se duplican.

### Verificar la integridad
```bash
node scripts/verify-vendor.mjs
```

### Actualizar a una versión nueva
1. En `platform-nexus`: `pnpm exec tsc -p packages/app-surface/tsconfig.json && cd packages/app-surface && pnpm pack`.
2. Copiar el `.tgz` resultante a este directorio.
3. Actualizar la versión y el SHA-256 en este README y en `scripts/verify-vendor.mjs`.
4. Actualizar la dependencia en el `package.json` que la consume y regenerar el lockfile.
