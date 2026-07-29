# 003C — Fulfillment y devoluciones

- Picking → Packed → Shipped → Delivered en la bandeja Admin (acciones reales).
- Salida del ledger SOLO al enviar (idempotente); asignación de almacén viene
  de las líneas del pedido; cancelación libera reserva.
- Devoluciones (E2E nuevo): entrada por inspección — OK reintegra a vendible,
  dañada entra como `dañado` (jamás disponible); contabilización idempotente
  por id de devolución; `Refund observed` solo con referencia.
- Parciales: el modelo de movimientos por línea/cantidad los admite (recepciones
  parciales certificadas en PBOS-001 RECEIVING/RETURNS).
