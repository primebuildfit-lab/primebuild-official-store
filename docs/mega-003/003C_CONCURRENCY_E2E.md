# 003C — Concurrencia (E2E)

Test «dos checkouts concurrentes sobre las últimas unidades» (e2e-official-store-flow):
- A reserva la última unidad → OK.
- B intenta con el estado que ya incluye la reserva viva de A → `OVERSELL_PREVENTED`.
- Reintento de A con la misma clave → `idempotentReplay=true` (no duplica).
El disponible descuenta reservas vivas (Active/Extended no vencidas); las vencidas
liberan automáticamente (test de caducidad).
