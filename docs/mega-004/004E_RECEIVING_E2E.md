# 004E — Recepción E2E

Wizard nuevo `/inventory/receiving-wizard` (sección 43 del registro): producto
espejado → variante/SKU (con barcode observado) → almacén → cantidad contada →
condición → costo observado (opcional) → evidencia (obligatoria si no es DEMO)
→ contabilización append-only (actor+motivo+correlación) → verificación
inmediata: available por SKU, visibilidad pública, precio PB/USD del contrato,
veredicto de envío rápido, enlace al storefront. Corrección = movimiento
compensatorio auditado con un clic (idempotente: no se revierte dos veces).
El dry-run usa el flag DEMO (etiquetado en el motivo); el snapshot de 52
productos JAMÁS se convierte en stock — la cantidad siempre la teclea el
operador con las unidades delante.
