# PrimeBuild Official Store — puesta en marcha del release automático

Estado a 2026-07-19. Todo el código y la automatización están **listos y commiteados**.
Faltan 3 pasos que requieren tus credenciales.

---

## Contexto: por qué cambiamos de repo

Official Store publicaba sus releases en `primebuildfit-lab/primebuild-saas`, compartido
con las apps de Eventra, y el updater resolvía `releases/latest/download/...`.

**Eso se rompió en producción hoy mismo:** Eventra publicó `eventra-desktop-v0.1.2` a las
13:02, después de `store-v0.1.2` (12:17). El puntero `latest` se movió y el endpoint de la
Store pasó a devolver **404**. Dos apps no pueden compartir el puntero `latest` de forma
fiable.

**Solución aplicada** (la que ya usan Eventra Internal OS y Business Admin):

- Repo propio: `primebuildfit-lab/primebuild-official-store`
- El updater lee un **tag FIJO**, nunca `releases/latest`:
  `releases/download/store-latest/latest-store.json`
- El workflow re-apunta ese tag fijo en cada publicación, automáticamente.

Así ninguna otra app puede volver a robarle el manifiesto.

---

## Lo que ya está hecho

| Pieza | Estado |
|---|---|
| Rediseño premium promovido sobre el original | ✅ (respaldo en `-PRE-REDESIGN-BACKUP`) |
| Repo git local, rama `main`, 5 commits | ✅ árbol limpio |
| Versión sincronizada en los 3 ficheros | ✅ **0.1.3** (0.1.2 ya está publicada) |
| Los 4 arreglos del updater | ✅ ya portados a este árbol (ver `PRIMEBUILD_OFFICIAL_STORE_UPDATER_REPORT.md`) |
| Endpoint apuntando al tag fijo `store-latest` | ✅ |
| Workflow CI que firma, publica y mantiene el canal | ✅ `.github/workflows/desktop-release.yml` |
| Auditoría de secretos del historial | ✅ limpio — seguro para repo público |

---

## Paso 1 — Crear el repo y subir el código

Lo intenté y el sistema de permisos lo bloqueó (crear un repo público es irreversible).
Ejecútalo tú:

```powershell
cd D:\empresas\WorkspaceExtra\PrimeBuildOfficialStore
& "C:\Program Files\GitHub CLI\gh.exe" repo create primebuildfit-lab/primebuild-official-store `
  --public --source=. --remote=origin --push `
  --description "PrimeBuild Official Store — read-only administration console for the live primebuildfit Shopify store (Tauri desktop app)."
```

> **Debe ser público.** El updater descarga los assets **sin autenticación**; en un repo
> privado daría 404. Ya verifiqué que el historial no contiene secretos: no hay `.env`,
> ni claves, ni tokens reales (solo marcadores `shpat_********`). La clave privada de
> firma vive fuera del proyecto y nunca se commiteó.

## Paso 2 — Cargar los secretos de firma

*Settings → Secrets and variables → Actions → New repository secret*

| Secreto | Valor |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | contenido completo de `C:\Users\carlo\.tauri\primebuild-store.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | la contraseña de esa clave |

O por CLI:

```powershell
$gh = "C:\Program Files\GitHub CLI\gh.exe"
& $gh secret set TAURI_SIGNING_PRIVATE_KEY --repo primebuildfit-lab/primebuild-official-store < "$env:USERPROFILE\.tauri\primebuild-store.key"
& $gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD --repo primebuildfit-lab/primebuild-official-store
```

> ⚠️ **`~/.tauri/primebuild-store.key` es el único punto de fallo irreversible.** Es lo
> único capaz de entregar una actualización a las copias ya instaladas. Si se pierde,
> quedan permanentemente sin poder actualizarse. Existe **una sola copia, en `C:`** —
> necesita un respaldo real fuera de la máquina (gestor de contraseñas o soporte cifrado).

## Paso 3 — Lanzar el release automático

```powershell
git tag store-v0.1.3
git push origin store-v0.1.3
```

El workflow entonces, solo:

1. instala dependencias y comprueba que la versión esté sincronizada;
2. compila el bundle y lo **firma** con tu secreto;
3. genera `latest-store.json` con la URL y la firma correctas;
4. publica el release `store-v0.1.3` con `.exe` + `.sig` + manifiesto;
5. **re-apunta el tag fijo `store-latest`** a ese manifiesto.

Seguimiento: `gh run watch --repo primebuildfit-lab/primebuild-official-store`

---

## Comprobar que funciona

```powershell
# el endpoint del updater debe responder 200 con el manifiesto de la 0.1.3
curl.exe -sSL https://github.com/primebuildfit-lab/primebuild-official-store/releases/download/store-latest/latest-store.json
```

Prueba real A→B: instala el `*-setup.exe` de la 0.1.3, luego publica una 0.1.4 y abre la
app instalada → menú **Actualizaciones**. Debe detectar, verificar firma, instalar y
reabrirse sola.

> El informe previo (§7-bis) advierte: la prueba de actualización instalada no se repitió
> sobre la copia rediseñada. **Conviene hacerla una vez** ahora que se promovió.

---

## Notas para no romper esto

- **El `OWNER/REPO` de `tauri.conf.json` es intencionado.** `updater.rs:132` lo trata como
  "no configurado" para que el panel no mienta. El endpoint real manda desde
  `dist.config.json`, que tiene prioridad en runtime (`updater.rs:155-164`). No lo "arregles".
- **Nunca metas `$comment` en `tauri.release.conf.json`.** El esquema de Tauri rechaza
  propiedades desconocidas y rompe *todos* los builds firmados.
- **GitHub renombra los assets:** todo carácter fuera de `[A-Za-z0-9._-]` pasa a punto.
  `release.mjs` ya lo reproduce con `githubAssetName()`. No generes la URL con `%20`.
- **La app instalada no hereda cambios de `dist.config.json`**: lleva su propia copia
  empaquetada. Cambiar el endpoint exige publicar una versión nueva.
