# 003E — Informe anti-arbitraje

`validateRoundTrip` simula ambos ciclos bajo AMBAS lecturas con spread, comisión
de transferencia (opt-in), comisión de proveedor (parámetro) y redondeo half-up
a 12 decimales. Resultado vigente: lectura cliente = arbitraje ⇒
**BLOCK_PRODUCTION_ACTIVATION global** hasta aprobación del owner. Prueba
adicional: con comisión de proveedor ≥2% el ciclo cliente deja de ser rentable
(test). El validador NUNCA cambia tasas. Sellado por la suite de paridad en los
7 repos y visible en CoinOS instalado (0.3.0) y en /catalog/pb-pricing.
