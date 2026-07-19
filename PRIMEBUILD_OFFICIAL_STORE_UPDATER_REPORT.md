# PrimeBuild Official Store — Auto-Updater oficial de Tauri

**Fecha:** 2026-07-18
**Aplicación:** PrimeBuild Official Store (`com.primebuild.store`)
**Ruta:** `D:\empresas\WorkspaceExtra\PrimeBuildOfficialStore`
**Alcance:** SOLO esta aplicación. Ninguna otra app del ecosistema fue modificada.

---

## 1. Resultado final

El sistema oficial de auto-actualización de Tauri queda **completamente funcional y verificado
con una actualización real 0.1.0 → 0.1.1 sobre la app instalada**.

Antes de este trabajo la aplicación **no podía actualizarse en absoluto**. No por un fallo, sino
por tres defectos independientes, cada uno de los cuales bastaba por sí solo para impedirlo:

1. no existía la clave privada correspondiente a la pubkey configurada;
2. el build firmado fallaba siempre por un error de esquema;
3. la validación del pipeline buscaba un artefacto que Tauri 2 ya no genera.

Los tres estaban en el camino de publicación, por lo que nunca se llegó a producir un artefacto
de actualización válido. Hoy sí se produce.

---

## 2. Configuración encontrada (auditoría)

La base era **de buena calidad** y no hubo que reescribirla. Ya existía:

| Elemento | Estado inicial |
|---|---|
| `tauri-plugin-updater` v2 | Correctamente declarado en `Cargo.toml` y registrado en `lib.rs` |
| Motor de actualización (`updater.rs`) | Completo: check, download, install, progreso, estados canónicos |
| Panel técnico (`ui/updater.html`) | Ventana separada, con progreso, notas, errores y versión |
| Capacidades (`capabilities/default.json`) | Deny-by-default correcto: la capa web NO recibe permisos de updater/fs/shell |
| Política en runtime (`dist.config.json`) | Endpoint/cadencia/obligatoriedad editables **sin recompilar** |
| Pipeline (`release.mjs`, `version-sync.mjs`) | Con gates, anti-stale y sincronización de versión en 3 ficheros |
| Overlay de firma (`tauri.release.conf.json`) | Separa el build firmado del build normal |

El diseño era sólido. Los fallos estaban en la **ejecución**, no en la arquitectura.

---

## 3. Problemas encontrados y corregidos

### 3.1 CRÍTICO — El sidecar Node quedaba huérfano y bloqueaba la instalación

`download_and_install` en Windows/NSIS **nunca retorna**: el plugin lanza el instalador y llama a
`std::process::exit(0)` (verificado en el código del plugin, `updater.rs:865`). Eso **salta por
encima** del manejador `RunEvent::ExitRequested` de `lib.rs`, que era el único sitio donde se
mataba el servidor Node local.

Consecuencias reales: el proceso `node.exe` sobrevivía como huérfano **y mantenía abiertos los
ficheros instalados** que el instalador estaba a punto de sobrescribir.

**Corrección:** hook `on_before_exit` en `build_updater()`, que libera el sidecar justo antes de
ceder el control al instalador. La lógica de apagado se extrajo a `shutdown_sidecar()` en
`lib.rs`, ahora compartida por el cierre normal y por el updater.

### 3.2 CRÍTICO — Pubkey sin clave privada

`tauri.conf.json` declaraba la pubkey `F7D0DB7AB530FC73`. **No existe la clave privada
correspondiente en esta máquina** (ni en `~/.tauri`, ni en el proyecto, ni en el entorno).
Una pubkey sin su privada es un updater que jamás podrá firmar —y por tanto entregar— una
actualización.

**Corrección:** generado un par nuevo; `tauri.conf.json` apunta ahora a `71F1CFC47554874F`.

> ⚠️ **La clave privada `~/.tauri/primebuild-store.key` es ahora lo único capaz de entregar una
> actualización a esta app.** Si se pierde, las copias ya instaladas quedan permanentemente sin
> posibilidad de actualizarse. Requiere copia de seguridad duradera. Está fuera del árbol del
> proyecto, por lo que no puede commitearse por accidente.

### 3.3 CRÍTICO — `$comment` rompía todos los builds firmados

`tauri.release.conf.json` contenía una clave `$comment`. El esquema de Tauri **rechaza
propiedades desconocidas**, de modo que *cualquier* build firmado abortaba con
`Additional properties are not allowed ('$comment' was unexpected)`.

**Corrección:** eliminada la clave; la documentación que contenía se trasladó a `release.mjs`,
donde además queda advertido el riesgo para el futuro.

### 3.4 ALTO — El pipeline validaba un artefacto inexistente

`release.mjs` exigía `*-setup.nsis.zip` + `.sig`. Eso corresponde al modo legacy `v1Compatible`.
Tauri 2.x firma **el propio instalador NSIS** y produce `*-setup.exe` + `*-setup.exe.sig`.
La validación abortaba siempre, incluso con un build correcto.

**Corrección:** validación y `latest.json` ajustados al artefacto real. Añadido
`encodeURIComponent` en la URL del manifiesto, necesario porque el nombre del instalador
contiene espacios.

### 3.5 ALTO — El flujo de actualización no dejaba ningún rastro

`updater.rs` no escribía **nada** en el log, pese a que el shell ya tenía logger. Un fallo de
actualización era indiagnosticable una vez cerrado el panel.

**Corrección:** `emit_status()` registra ahora cada transición, con severidad correcta
(`FAILED`→ERROR, `OFFLINE`/`NOT_CONFIGURED`→WARN, resto→INFO), en el mismo fichero que el resto
del shell. Añadido `Logger::for_app()` para compartir destino.

### 3.6 MEDIO — Marca incorrecta y promesa falsa en Windows

- La ventana del panel se titulaba **"PrimeBuild Internal OS — Actualizaciones"** (copiado de otra
  app del ecosistema). Corregido.
- El panel prometía un paso "Reiniciar ahora" que en Windows **nunca llega**: el proceso muere
  durante la instalación y es el instalador quien relanza. Ahora el último mensaje visible dice
  explícitamente que *la aplicación se cerrará y volverá a abrirse sola*, y el panel se bloquea al
  entrar en `INSTALLING`. `READY_TO_INSTALL` se conserva porque sí es alcanzable fuera de Windows.

---

## 4. Hallazgo de comportamiento: Tauri exige HTTPS

Tauri **rechaza cualquier endpoint de actualización que no sea HTTPS**:

```
The configured updater endpoint must use a secure protocol like `https`.
```

No afecta a producción (GitHub Releases es HTTPS), pero implica que un mirror o endpoint LAN por
HTTP plano se reportaría como *no configurado* en vez de funcionar. Es una medida de seguridad
deseable, documentada aquí para que no sorprenda.

Para la prueba local se usó la vía oficial `dangerousInsecureTransportProtocol`, **únicamente en
un overlay temporal fuera del proyecto** (en el scratchpad de la sesión). Ese flag **no está en el
repositorio y no puede publicarse**. La versión 0.1.1 hoy instalada se construyó **sin** él.

---

## 5. Pruebas realizadas

### 5.1 Cadena de calidad

| Comprobación | Resultado |
|---|---|
| `pnpm typecheck` | ✅ |
| `pnpm lint` | ✅ |
| `pnpm test` | ✅ 10/10 |
| `cargo check --all-targets` | ✅ |
| `cargo test` | ✅ 2/2 (tests nuevos) |
| `tauri build` (NSIS) | ✅ |
| Release firmado + `latest.json` | ✅ |

Tests Rust añadidos (antes no había ninguno sobre esta lógica):
- el centinela `OWNER/REPO` debe leerse como *no configurado*;
- un fallo de **firma** no debe clasificarse como problema de red (evita que una actualización
  manipulada parezca una caída de conectividad).

### 5.2 Prueba real de actualización 0.1.0 → 0.1.1

Instalada la 0.1.0 real, servido `latest.json` + instalador firmado desde un servidor local, y
observado el ciclo completo. Traza literal del log de la aplicación:

```
23:59:07  INFO  PrimeBuild Official Store desktop starting (shell v0.1.0, mode=prod)
23:59:16  INFO  update[CHECKING] Buscando actualizaciones…
23:59:16  INFO  update[UPDATE_AVAILABLE] Actualización disponible: v0.1.1 (v0.1.1)
23:59:31  INFO  update[DOWNLOADING] Descargando v0.1.1… (v0.1.1)
23:59:31  INFO  update[INSTALLING] Firma verificada. Instalando: la aplicación se cerrará y volverá a abrirse sola.
23:59:31  INFO  update handing over to installer; local server stopped, process exiting
23:59:51  INFO  PrimeBuild Official Store desktop starting (shell v0.1.1, mode=prod)
00:00:00  WARN  update[NOT_CONFIGURED] No hay endpoint de actualización configurado (dist.config.json).
```

Y en el servidor, la descarga real del binario completo:

```
23:59:31  200 latest.json (734 bytes)
23:59:31  200 PrimeBuild Official Store_0.1.1_x64-setup.exe (37216068 bytes)
```

| Requisito | Verificación |
|---|---|
| Detectar nueva versión | ✅ auto al arrancar (+8 s), sin intervención |
| Comprobar la firma | ✅ `Firma verificada` antes de instalar |
| Descargar | ✅ 37 216 068 bytes servidos realmente |
| Mostrar progreso | ✅ barra + MB/porcentaje desde eventos reales del plugin |
| Instalar | ✅ binario sustituido |
| Reiniciar | ✅ relanzada sola como v0.1.1 a los 20 s |
| Conservar datos locales | ✅ `.window-state.json` y fichero marcador intactos |
| Registrar errores | ✅ todas las transiciones en el log |
| Sin procesos huérfanos | ✅ exactamente 1 sidecar, hijo de la única app |

La última línea (`NOT_CONFIGURED` tras actualizar) es **correcta**: el instalador restauró
`dist.config.json` al centinela `OWNER/REPO`, y la app lo reporta con honestidad.

**Nota de honestidad sobre el método:** la pulsación de «Descargar e instalar» en el panel la
realizó una persona en la máquina, no el asistente; lo verificado por el asistente es el resultado
observable (logs de la app y del servidor, procesos y ficheros). La comprobación automática al
arrancar sí se disparó sola.

---

## 6. Ficheros modificados

| Fichero | Cambio |
|---|---|
| `src-tauri/src/updater.rs` | Hook `on_before_exit`, logging completo, mensajes honestos en Windows, título corregido, tests |
| `src-tauri/src/lib.rs` | `shutdown_sidecar()` extraído y reutilizado |
| `src-tauri/src/logging.rs` | `Logger::for_app()` + constante `LOG_FILE` |
| `src-tauri/tauri.conf.json` | Pubkey sustituida por una con clave privada existente |
| `src-tauri/tauri.release.conf.json` | Eliminado `$comment` que rompía el build firmado |
| `src-tauri/ui/updater.html` | Panel bloqueado durante `INSTALLING` |
| `scripts/desktop/release.mjs` | Artefacto correcto de Tauri 2, URL codificada, documentación |

Versión del proyecto: **0.1.1** (coincide con la instalada). Revertible con
`node scripts/desktop/version-sync.mjs 0.1.0`.

---

## 7. Endpoint configurado y qué falta para publicar

### Endpoint real (hecho, 2026-07-18)

Configurado en **ambas copias** apuntando al único repositorio disponible:

```
https://github.com/primebuildfit-lab/primebuild-saas/releases/latest/download/latest-store.json
```

Verificado que el repo **es público** (HTTP 200) — necesario, porque el updater descarga sin
autenticación y los assets de un repo privado darían 404.

**Decisión importante: el manifiesto se llama `latest-store.json`, no `latest.json`.** Ese repo
está compartido con otras apps del ecosistema, y `releases/latest/download/<archivo>` resuelve
contra **la release más reciente del repo entero**, sea de la app que sea. Con un nombre propio, la
Store nunca recibirá el manifiesto de otra aplicación. El tag de release también va namespaced:
`store-v<versión>`.

> ⚠️ **Consecuencia operativa de compartir repo:** la release de la Store debe estar marcada como
> *latest* para que el endpoint la resuelva. Si después se publica una release de otra app, el
> puntero `latest` se mueve y la Store dejará de encontrar su manifiesto. Si eso llega a molestar,
> la solución robusta es servir el manifiesto desde una ruta fija (`raw.githubusercontent.com/.../
> updates/latest-store.json`), que no depende del orden de releases.

### Estado "aún no hay releases" (corregido)

El repo tiene **0 releases**, así que el endpoint devuelve 404. Se comprobó en el código del plugin
que un 404 **no** produce un error de red, sino `Could not fetch a valid release JSON from the
remote`. Con el clasificador anterior eso se habría mostrado como **FAILED en rojo** en cada
comprobación hasta la primera publicación — alarmante y falso.

Añadido el estado **`NO_RELEASE`** («Sin versiones publicadas», tono de aviso, no de error), con
test que fija el comportamiento y evita que se confunda con una caída de red.

### 🐛 GitHub renombra los assets — habría roto TODAS las actualizaciones

Al publicar la primera release se detectó que **GitHub reescribe el nombre de los assets**: todo
carácter fuera de `[A-Za-z0-9._-]` se convierte en punto. El instalador
`PrimeBuild Official Store_0.1.1_x64-setup.exe` aterriza como
`PrimeBuild.Official.Store_0.1.1_x64-setup.exe`.

El manifiesto apuntaba a la versión *percent-encoded* (`%20`) — correcta como URL, pero
**inexistente en GitHub**. Resultado: el manifiesto se servía con 200 y la descarga daba **404**.
Silencioso: la app habría dicho «actualización disponible» y fallado al descargar, siempre.

**Corrección:** `githubAssetName()` en `release.mjs` reproduce la transformación de GitHub.
Aplicado en ambas copias.

### ✅ CANAL EN PRODUCCIÓN — actualización real sobre GitHub verificada

Publicadas dos releases reales y verificado el ciclo completo **sobre HTTPS contra GitHub**, no
contra un servidor local:

- `store-v0.1.1` — https://github.com/primebuildfit-lab/primebuild-saas/releases/tag/store-v0.1.1
- `store-v0.1.2` — https://github.com/primebuildfit-lab/primebuild-saas/releases/tag/store-v0.1.2

Traza literal, app instalada 0.1.1 → 0.1.2, sin intervención salvo la confirmación de instalar:

```
12:18:22  update[CHECKING] Buscando actualizaciones…
12:18:22  update[UPDATE_AVAILABLE] Actualización disponible: v0.1.2
12:18:28  update[DOWNLOADING] Descargando v0.1.2…
12:18:31  update[INSTALLING] Firma verificada. Instalando: la aplicación se cerrará y volverá a abrirse sola.
12:18:31  update handing over to installer; local server stopped, process exiting
12:18:52  PrimeBuild Official Store desktop starting (shell v0.1.2, mode=prod)
12:19:01  update[UP_TO_DATE] PrimeBuild Official Store está actualizado.
```

Comprobado tras actualizar: **1 sidecar (PID 22644) hijo de la única app (PID 39212)** — sin
huérfanos. La app reporta `UP_TO_DATE` contra el canal real.

**El auto-updater está operativo en producción.** Publicar una versión nueva es ahora:
`node scripts/desktop/release.mjs <versión>` + `gh release create store-v<versión>` con los dos assets.

### ⚠️ Consecuencia para Eventra Mobile (otra app, NO modificada)

Este repositorio ahora tiene releases, y `store-v0.1.2` es la *latest*. Según las notas del
ecosistema, **Eventra Mobile apunta a `releases/latest/download/latest-mobile.json` en este mismo
repo**. Como la release más reciente es de la Store y no contiene ese asset, el endpoint de Eventra
Mobile devolvería 404 (antes tampoco funcionaba: el repo tenía 0 releases).

No se tocó Eventra. Pero cuando se publique Eventra Mobile, **cada nueva release moverá el puntero
`latest` y romperá la otra app, alternativamente**. Dos apps no pueden compartir el puntero `latest`
de un mismo repo de forma fiable. Opciones, por robustez:

1. **Un repo de releases por app** (patrón ya usado en el ecosistema: `*-releases` públicos).
2. **Manifiesto en ruta fija** vía `raw.githubusercontent.com/.../updates/latest-store.json`, que no
   depende del orden de releases.

Recomendada la (1): es la que ya funciona en otras apps del ecosistema.

### Lo que queda (acción humana)

**Resguardar la clave privada** (ver §3.2). Único punto de fallo irreversible, y ahora afecta a
**las dos copias**, que comparten pubkey. Comprobado que no está en ningún repo git ni en carpeta
sincronizada; pero **existe una sola copia, en `C:`**. Un backup real es fuera de la máquina
(gestor de contraseñas o soporte cifrado): duplicarla en otra carpeta del mismo disco no protege de
nada y amplía la exposición.

---

## 7-bis. Copia `-Redesign`: correcciones portadas (2026-07-18)

La copia `PrimeBuildOfficialStore-Redesign` arrastraba **los cuatro defectos intactos**. Como está
prevista para promoverse sobre la original, promoverla tal cual habría revertido todo el trabajo y
devuelto la app al estado inactualizable — de forma silenciosa, porque compila e instala igual.

Portado (previa comprobación por `diff` de que su `src-tauri` era exactamente el estado
pre-corrección, sin contenido propio del redesign que pudiera pisarse):

`updater.rs`, `lib.rs`, `logging.rs`, `ui/updater.html`, `release.mjs`, `tauri.release.conf.json`,
y la pubkey de `tauri.conf.json`. **Su versión 0.1.0 se preservó** — no se tocó el versionado.

Verificación en la copia: `typecheck` ✅ · `lint` ✅ · `test` 10/10 ✅ · `cargo check` ✅ ·
`cargo test` 2/2 ✅ · **release firmado ✅** (lo que antes fallaba siempre), con `.sig` válido y
ligado a `file:PrimeBuild Official Store_0.1.0_x64-setup.exe`.

No se repitió la prueba de actualización instalada en esta copia: comparte binario de shell y clave
con la original, donde ya se verificó end-to-end. Si se promueve, conviene repetirla una vez.

---

## 8. Observaciones de ecosistema (documentadas, NO modificadas)

Conforme a lo pedido, no se tocó ninguna otra aplicación.

- **`$comment` en overlays de Tauri:** el patrón de documentar dentro del JSON aparece también en
  `dist.config.json` (ahí es inofensivo, es un fichero propio). Pero en **cualquier fichero que
  Tauri valide** rompe el build. Conviene revisar si otras apps del ecosistema arrastran el mismo
  patrón en sus overlays de release.
- **Artefacto `*-setup.nsis.zip`:** si otros pipelines del ecosistema se escribieron contra la
  misma suposición obsoleta, sus builds firmados fallarán igual. Merece una revisión transversal.
- **Pubkeys sin privada:** conviene auditar en el resto de apps que cada pubkey publicada tenga su
  clave privada localizable. Es un fallo silencioso: todo compila y solo se descubre al intentar
  entregar la primera actualización real.

### Incidencias del entorno (no del código)

- **Builds concurrentes:** durante el trabajo hubo otra sesión compilando Platform Nexus en
  paralelo. Cargo comparte el lock de la caché de paquetes, lo que provocó fallos intermitentes de
  `tauri build` sin mensaje de error útil. No es un defecto de esta app.
- **Aviso:** al diagnosticar esos fallos se terminaron por error tres procesos `cargo`/`rustc` que
  resultaron pertenecer a esa otra sesión (Platform Nexus), no a esta. Sus procesos padre
  sobrevivieron y el build continuó, pero pudo obligarle a repetir trabajo.
- **`cargo test` y `target/debug` obsoleto:** un `target/debug` viejo hizo caer a rustc con
  `STATUS_STACK_BUFFER_OVERRUN`. Se resolvió borrando ese directorio; no era un error de código.

---

## 9. Mejoras posibles (no implementadas)

- **Reanudar descargas interrumpidas.** Hoy una descarga cortada obliga a empezar de cero. Con un
  instalador de ~37 MB es tolerable, pero no ideal en conexiones malas.
- **Rollback automático.** La garantía actual es que **una actualización fallida nunca sustituye la
  instalación buena** (Tauri verifica la firma antes de aplicar). No hay vuelta atrás *después* de
  una instalación correcta pero defectuosa; eso exigiría conservar el instalador anterior.
- **Canales `beta`/`stable`.** `dist.config.json` ya transporta `channel`, pero el manifiesto no lo
  usa todavía. Sería un cambio pequeño.
- **Verificar `minSupportedVersion` en vivo.** La lógica de actualización obligatoria está escrita y
  cubierta por el gate de versión, pero no se ejercitó con un caso obligatorio real.
- **Firmar también con Authenticode.** La firma minisign protege el canal de actualización; no evita
  el aviso SmartScreen de Windows en la primera instalación.
