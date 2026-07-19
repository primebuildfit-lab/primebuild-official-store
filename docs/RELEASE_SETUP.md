# PrimeBuild Official Store — puesta en marcha del release automático

Estado a 2026-07-19. La automatización está **construida y validada**; faltan los
pasos que requieren tus credenciales de GitHub.

---

## Lo que ya está hecho

| Pieza | Estado |
|---|---|
| Repositorio git local (`main`, 2 commits) | ✅ |
| Pipeline de release (`scripts/desktop/release.mjs`) | ✅ ya existía, validado |
| Gate de versión (`pnpm desktop:version --check`) | ✅ en sync a v0.1.0 |
| Workflow CI (`.github/workflows/desktop-release.yml`) | ✅ creado |
| Manifiesto `latest-store.json` = endpoint del updater | ✅ coinciden |
| Clave pública del updater en `tauri.conf.json` | ✅ |
| Clave privada de firma | ✅ existe en `~/.tauri/primebuild-store.key` |

---

## ⚠️ Decisión pendiente: dónde viven los releases

Hay una **incoherencia** que hay que resolver antes del primer release, porque si
no, el auto-update fallará sin dar error visible.

- `src-tauri/dist.config.json` dice que el updater busca en:
  `https://github.com/primebuildfit-lab/primebuild-saas/releases/latest/download/latest-store.json`
  → es el repo de **Eventra** (estrategia de "repo de releases compartido").
- Pero el workflow publica en el repo **donde se ejecuta** (`github.repository`).

Si subes Official Store a su propio repo, el workflow publicará ahí, mientras la
app seguirá mirando a `primebuild-saas`. **No se encontrarían nunca.**

### Opción A (recomendada) — repo propio

1. Crear `primebuildfit-lab/primebuild-official-store`.
2. Cambiar el endpoint en `src-tauri/dist.config.json` a ese repo.
   Es un recurso leído en runtime: **no requiere recompilar la app**.

### Opción B — mantener el repo de releases compartido

Publicar los releases en `primebuild-saas`. Requiere que el workflow apunte a ese
repo explícitamente (o alojar ahí el código), y usar el secreto
`RELEASE_DOWNLOAD_BASE`.

---

## Pasos que debes dar tú (requieren tus credenciales)

Yo no puedo autenticarme en GitHub por ti.

### 1. Instalar el CLI (opcional, o hazlo por la web)

```powershell
winget install GitHub.cli
gh auth login
```

### 2. Crear el repo y subir el código

```powershell
cd D:\empresas\WorkspaceExtra\PrimeBuildOfficialStore
gh repo create primebuildfit-lab/primebuild-official-store --private --source=. --push
```

### 3. Cargar los secretos de firma

En *Settings → Secrets and variables → Actions*:

| Secreto | Valor |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | contenido de `~/.tauri/primebuild-store.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | su contraseña |

> La clave privada **nunca** debe commitearse. Solo vive en estos secretos.

### 4. Aplicar la decisión de arriba (si eliges la Opción A)

Editar el `endpoint` de `src-tauri/dist.config.json` al repo nuevo y commitear.

### 5. Lanzar el primer release automático

```powershell
git tag store-v0.1.0
git push origin store-v0.1.0
```

El workflow compila, firma, genera `latest-store.json` y crea el Release.

### 6. Publicar el Release

Se crea como **borrador a propósito** — nada se hace público sin que tú lo
revises. Ábrelo, compruébalo y pulsa *Publish*, marcándolo como **latest**.

> El updater **solo ve releases publicados y marcados como "latest"**. Mientras
> siga en borrador, es invisible para la app: esa es la puerta de seguridad.

---

## Cómo comprobar que funciona (prueba A→B)

1. Instala el `*-setup.exe` de v0.1.0.
2. Sube la versión (`node scripts/desktop/release.mjs 0.1.1`), etiqueta
   `store-v0.1.1`, publica el Release.
3. Abre la app instalada → menú **Actualizaciones**. Debe detectar la 0.1.1,
   descargarla, verificar la firma, instalarla y reiniciarse.

Hasta que exista un release publicado, el panel dirá honestamente que no hay
actualizaciones — no es un fallo, es el comportamiento diseñado.

---

## Nota sobre el centinela `OWNER/REPO`

`src-tauri/tauri.conf.json` conserva `https://github.com/OWNER/REPO/...` como
endpoint. **Es intencionado y no hay que tocarlo**: `updater.rs` lo trata como
"no configurado" para que la app no mienta. El endpoint real manda desde
`dist.config.json`, que tiene prioridad en runtime (ver `updater.rs:155-164`).
