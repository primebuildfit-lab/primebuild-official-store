# PrimeBuild Official Store — puesta en marcha del release automático

Estado a 2026-07-19.

---

## El canal se define en un solo sitio

Desde `PB-FIX-003`, el propietario, el repositorio, la etiqueta fija, el manifiesto y el prefijo de release viven **únicamente** en [`updater-channel.json`](../updater-channel.json).

Este documento **no repite esos valores**. Para leerlos:

```powershell
node scripts/desktop/channel.mjs --print
```

```
CHANNEL_REPO=<propietario>/<repositorio>
CHANNEL_TAG=<etiqueta fija del canal>
CHANNEL_MANIFEST=<nombre del manifiesto>
CHANNEL_TAG_PREFIX=<prefijo de las etiquetas de versión>
CHANNEL_ENDPOINT=<URL que consulta la app instalada>
```

En los comandos de abajo, sustituye `$CHANNEL_*` por esos valores (o expórtalos antes).

`tests/desktop/updater-channel.test.ts` falla si alguien vuelve a escribir el canal a mano en el workflow, en `release.mjs`, en `dist.config.json` o en este documento.

---

## Contexto: por qué el canal es como es

Official Store publicaba sus releases en un repositorio compartido con las apps de Eventra, y el updater resolvía el puntero `latest` del repositorio.

**Eso se rompió en producción:** Eventra publicó `eventra-desktop-v0.1.2` a las 13:02, después de la versión 0.1.2 de la Store (12:17). El puntero `latest` se movió y el endpoint de la Store pasó a devolver **404**. Dos apps no pueden compartir ese puntero de forma fiable.

**Solución aplicada:**

- Repositorio propio, exclusivo de esta app.
- El updater lee una **etiqueta FIJA**, nunca el puntero `latest`.
- El workflow re-apunta esa etiqueta en cada publicación, automáticamente.
- El manifiesto lleva un nombre propio de la app, no `latest.json`, para que un repositorio compartido no pueda servir el manifiesto de otra.

Ninguna otra app puede volver a robarle el manifiesto.

---

## Estado

| Pieza | Estado |
|---|---|
| Repo git local | ✅ árbol limpio, `origin` configurado |
| Versión sincronizada en los 3 ficheros | ✅ **0.1.4** |
| Los 4 arreglos del updater | ✅ (ver `PRIMEBUILD_OFFICIAL_STORE_UPDATER_REPORT.md`) |
| Endpoint apuntando a la etiqueta fija | ✅ derivado y validado por test |
| Workflow CI que firma, publica y mantiene el canal | ✅ lee el canal de la fuente canónica |
| Canal definido una sola vez | ✅ `PB-FIX-003` |
| Auditoría de secretos del historial | ✅ limpio — seguro para repo público |
| Secretos de firma cargados en GitHub | ⛔ **pendiente de tus credenciales** |

---

## Paso 1 — Repositorio remoto

`origin` ya está configurado localmente. Si el repositorio remoto aún no existe, créalo tú (crear un repo público es irreversible y el sistema de permisos lo bloquea):

```powershell
cd D:\empresas\WorkspaceExtra\PrimeBuildOfficialStore
& "C:\Program Files\GitHub CLI\gh.exe" repo create $CHANNEL_REPO `
  --public --source=. --remote=origin --push `
  --description "PrimeBuild Official Store — read-only administration console for the live primebuildfit Shopify store (Tauri desktop app)."
```

> **Debe ser público.** El updater descarga los assets **sin autenticación**; en un repo privado daría 404. El historial no contiene secretos: no hay `.env`, ni claves, ni tokens reales (solo marcadores). La clave privada de firma vive fuera del proyecto y nunca se commiteó.

## Paso 2 — Cargar los secretos de firma

*Settings → Secrets and variables → Actions → New repository secret*

| Secreto | Valor |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | contenido completo de la clave de firma de esta app |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | su contraseña |

O por CLI (PowerShell **no** soporta `<` para redirigir ficheros; usa tubería):

```powershell
$gh = "C:\Program Files\GitHub CLI\gh.exe"

Get-Content "$env:USERPROFILE\.tauri\primebuild-store.key" -Raw | & $gh secret set TAURI_SIGNING_PRIVATE_KEY --repo $CHANNEL_REPO
& $gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD --repo $CHANNEL_REPO
```

> ⚠️ **La clave de firma es el único punto de fallo irreversible.** Es lo único capaz de entregar una actualización a las copias ya instaladas. Si se pierde, quedan permanentemente sin poder actualizarse. Existe **una sola copia, en este equipo** — necesita un respaldo real fuera de la máquina. Ese respaldo es `A-1` y pertenece a la fase de Seguridad.

## Paso 3 — Lanzar el release automático

Etiqueta con el prefijo declarado (`CHANNEL_TAG_PREFIX`) seguido de la versión:

```powershell
git tag "$CHANNEL_TAG_PREFIX$version"
git push origin "$CHANNEL_TAG_PREFIX$version"
```

El workflow entonces:

1. carga el canal desde `updater-channel.json`;
2. instala dependencias y comprueba que la versión esté sincronizada;
3. compila el bundle y lo **firma** con tu secreto;
4. genera el manifiesto con la URL y la firma correctas;
5. publica el release de esa versión con `.exe` + `.sig` + manifiesto;
6. **re-apunta la etiqueta fija** a ese manifiesto.

Seguimiento: `gh run watch --repo $CHANNEL_REPO`

---

## Comprobar que funciona

```powershell
# el endpoint del updater debe responder 200 con el manifiesto de la versión publicada
curl.exe -sSL $CHANNEL_ENDPOINT
```

Prueba real A→B: instala el `*-setup.exe`, publica la versión siguiente y abre la app instalada → menú **Actualizaciones**. Debe detectar, verificar firma, instalar y reabrirse sola.

> El informe previo (§7-bis) advierte: la prueba de actualización instalada no se repitió sobre la copia rediseñada. **Conviene hacerla una vez.**

---

## Notas para no romper esto

- **El canal no se escribe a mano en ningún sitio.** Edita `updater-channel.json` y todo lo demás se deriva. Hay tests que lo obligan.
- **El `OWNER/REPO` de `tauri.conf.json` es intencionado.** `updater.rs` lo trata como "no configurado" para que el panel no mienta. El endpoint real manda desde `dist.config.json`, que tiene prioridad en runtime. No lo "arregles".
- **Nunca metas `$comment` en `tauri.release.conf.json`.** El esquema de Tauri rechaza propiedades desconocidas y rompe *todos* los builds firmados.
- **GitHub renombra los assets:** todo carácter fuera de `[A-Za-z0-9._-]` pasa a punto. `release.mjs` ya lo reproduce con `githubAssetName()`. No generes la URL con `%20`.
- **La app instalada no hereda cambios de `dist.config.json`**: lleva su propia copia empaquetada. Cambiar el endpoint exige publicar una versión nueva.
- **El disparador `on.push.tags` del workflow repite el prefijo literalmente.** GitHub Actions no admite expresiones en `on:`; es la única excepción y está validada por test contra la fuente canónica.
