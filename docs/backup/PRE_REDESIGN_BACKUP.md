# Backup pre-rediseño — clasificación y protección

**Clasificación: CONSERVAR. Copia única. No eliminar.**
**Control:** `PB-C-001 / M-5`, protegido en `PB-FIX-002`.
**Fecha de clasificación:** 2026-07-19

---

## Qué es

`D:\empresas\WorkspaceExtra\PrimeBuildOfficialStore-PRE-REDESIGN-BACKUP` contiene PrimeBuild Official Store **v0.1.2**, la versión anterior al rediseño premium.

## Por qué no puede borrarse

**El primer commit de este repositorio (`7f3cdf3`) ya es el rediseño.** El código anterior no existe en ninguna historia de git, ni aquí ni en ningún otro sitio. Esa carpeta es la única copia.

Clasificarla como "conservar" no la protegía: seguía siendo una copia única, en un disco, sin verificar. Por eso `PB-FIX-002` añade un manifiesto y una segunda copia comprobada.

## Contenido

| Concepto | Valor |
|---|---|
| Archivos de fuente no regenerables | **142** |
| Tamaño de la fuente | 1,36 MB |
| Manifiesto con hash por archivo | [`PRE_REDESIGN_BACKUP_MANIFEST.json`](./PRE_REDESIGN_BACKUP_MANIFEST.json) |
| Versión | 0.1.2, superada por la 0.1.4 actual |
| Clave de firma | `71F1CFC47554874F` — la misma que usa la app actual |

Que la clave sea la misma importa: un instalador reconstruido desde este backup **seguiría siendo aceptado** por las instalaciones existentes. Es una vía de rollback real, no un archivo muerto.

### Qué se excluyó y por qué

| Excluido | Motivo |
|---|---|
| `src-tauri/binaries/node-…exe` (88,25 MB) | Runtime de Node descargado, no fuente. **Hash idéntico** al del repo activo, donde además está en `.gitignore`. La exclusión está probada, no supuesta: su hash queda registrado en el manifiesto |
| `src-tauri/target/` (~127 MB) | Salida de compilación de Rust, regenerable |
| `node_modules/` | Reinstalable desde `pnpm-lock.yaml` |
| `.next/` | Salida de compilación web, regenerable |

De los 196 MB originales, el contenido irreemplazable es **1,36 MB**.

## Segunda copia, verificada

```
D:\empresas\WorkspaceExtra\_local-backups\PrimeBuildOfficialStore-PRE-REDESIGN-source.tar.gz
```

- 565.698 bytes; su `sha256` está en el manifiesto.
- **Verificada, no solo creada:** se extrajo a un directorio temporal y se recalculó el hash de cada archivo contra el manifiesto. **142 de 142 coinciden.**
- Solo en disco local. No se ha subido a ningún remoto.

> Sigue estando en la misma máquina que el original. Eso reduce el riesgo de borrado accidental, no el de fallo del disco. Una copia externa es una de las condiciones de eliminación de abajo, precisamente porque hoy no existe.

## Cómo comprobar la integridad más adelante

1. Recalcular el `sha256` del `.tar.gz` y compararlo con `archive.sha256` del manifiesto.
2. Extraerlo y comparar cada archivo contra `files[]`.
3. Cualquier discrepancia significa corrupción o alteración: **no borrar nada** y avisar.

## Condiciones para permitir su eliminación futura

C15.2 exige auditoría, clasificación, rollback y documentación antes de eliminar. Hoy se cumplen tres; **falta el rollback**, porque no hay ninguna otra copia a la que volver.

Solo podrá eliminarse cuando se cumplan **todas**:

1. Se ha publicado una versión más reciente.
2. Esa versión se ha instalado y verificado funcionando.
3. Se conserva su instalador de rollback.
4. Existe una copia externa verificada **fuera de esta máquina**.
5. El propietario lo autoriza explícitamente.

Ninguna se da por supuesta y ninguna se sustituye por otra.

## Lo que esta orden no hizo

- No se alteró el backup original: sigue byte a byte como estaba.
- No se eliminó ningún archivo.
- No se mezcló con el repositorio activo.
- No se subió a ningún remoto.
- El repositorio versiona **solo** el manifiesto y esta clasificación.
