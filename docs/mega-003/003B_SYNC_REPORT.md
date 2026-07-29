# 003B — Informe de sincronización (determinista, sin credenciales)

- **Full sync real**: no ejecutable (WAITING_OWNER_CREDENTIALS). El camino está
  certificado por: (a) suite `mirror-sync.test` — upsert idempotente por hash,
  reintentos sin duplicar, ACTIVE ausente ⇒ `Removed from source` con historial,
  incremental no retira; (b) snapshot real de 52 ACTIVE + 39 colecciones pasado
  por `importSnapshot` (mismo upsert) en el runtime instalado 0.1.10 el
  2026-07-24 (52 vistos / estado Stale).
- **DRAFT/ARCHIVED**: excluidos por query (`status:active`) y por política de
  visibilidad (jamás públicos aunque estén espejados) — tests en verde.
- **Variantes/colecciones/media/SEO/tags**: campos del contrato §14 poblados en
  el snapshot (matriz adjunta); metafields: no autorizados aún (lista vacía).
- **sourceHash/updatedAt**: presentes en todos los registros del snapshot.
- **Estados**: 9 estados §21 sellados por test; `Stale` activo a las 24h sin sync.
- **Reconciliación**: diseño reconcile==full con retiro; puede programarse
  (scheduled) cuando existan credenciales; el webhook HMAC solo encola.
