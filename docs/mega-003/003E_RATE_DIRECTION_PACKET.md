# 003E — Paquete de decisión: dirección económica de las tasas (OWNER)

Tus etiquetas literales: **compra «1 USD = π PB» · venta «1 USD = 3.1 PB»**.
Admiten dos lecturas; NADA se infiere. Resultados simulados (SDK, 1000 de partida):

## Lectura A — CUSTOMER_PERSPECTIVE (cliente compra a π, vende a 3.1)
- USD→PB→USD: 1000 → 3141.59 PB → **1013.42 USD** ⇒ GANANCIA SIN RIESGO (+1.34%)
- PB→USD→PB: 1000 → 322.58 USD → **1013.42 PB** ⇒ GANANCIA SIN RIESGO
- Veredicto: **BLOCK_PRODUCTION_ACTIVATION** (arbitraje garantizado)

## Lectura B — COINOS_PERSPECTIVE (CoinOS compra a π, vende a 3.1: el cliente compra a 3.1 y entrega π al vender)
- USD→PB→USD: 1000 → 3100 PB → **986.76 USD** (spread ~1.32% a favor de la casa)
- PB→USD→PB: 1000 → 318.31 USD → **986.76 PB**
- Veredicto: **SAFE**

Opciones formales: CUSTOMER_BUYS_PB · CUSTOMER_SELLS_PB · COINOS_BUYS_PB ·
COINOS_SELLS_PB. Decisión = elegir qué etiqueta corresponde a qué lado.
Mientras no decidas: modo cotización, dinero real bloqueado, dirección
`OWNER_DECISION_PENDING` visible en CoinOS y en el Admin.
