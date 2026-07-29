# 003C — Ledger de inventario (certificación)

Cadena probada con módulos de producción (tests `owned-inventory` + E2E):
receiving → onHand → reserved → available → picking → shipped → returned/damaged/restocked.

- `available = onHand − reserved − damaged` (cuarentena en el término dañado, mostrada aparte).
- Nunca negativo: `wouldGoNegative` rechaza salidas que romperían físico/ok/dañado/cuarentena.
- Append-only: correcciones = movimientos compensatorios (`reverseMovement`); no hay total editable.
- Reason + actor obligatorios en cada movimiento; almacén obligatorio (`warehouseId`).
- Supplier stock AISLADO: solo `observedSupplierStock` en el espejo; officialFromMirror lo excluye (test).
- Reservation expiry + idempotencia por `idempotencyKey` (tests).
- Reconciliación: saldos siempre derivados del ledger — no existe estado paralelo que reconciliar.
