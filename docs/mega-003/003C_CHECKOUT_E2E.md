# 003C — Checkout E2E

Golden path certificado (test integral, datos reales del catálogo):
carrito (validación por SKU+almacén) → reserva atómica (30 min) → dirección →
envío (estándar por cotizar / recogida; lo desconocido NUNCA es 0) → elección
PB/USD → vista previa del quote (revalidación §38: caducidad y cambio de VA
exigen reconfirmación explícita) → revisión (desglose §41: 1% de transferencia
NO aplica a compras) → confirmación (pedido Awaiting payment; la reserva pasa a
Extended y sigue descontando hasta el envío). **Sin dinero real en ningún paso.**
Runtime: flujo servido por la instalada 0.1.10 (7/7 rutas verificadas 07-24).
