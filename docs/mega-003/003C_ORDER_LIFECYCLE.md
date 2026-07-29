# 003C — Ciclo de vida del pedido

13 estados §48 sellados por test; transiciones ilegales rechazadas; historial
actor/fecha en cada salto. **Paid/Refunded/Settled exigen evidencia observada**
(referencia externa) — sin ella la transición devuelve EVIDENCE_REQUIRED (tests
+ fixture de pago observado en el E2E). El envío contabiliza la salida del
ledger idempotente por orderId y convierte la reserva; cancelar la libera.
