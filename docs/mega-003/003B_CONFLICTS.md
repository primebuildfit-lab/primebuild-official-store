# 003B — Conflictos

Abiertos: **0**.

La matriz de propiedad por campo (§18, PBOS-001) rige la resolución:
Shopify gana título/descripcion/media/SEO; Official Store gana owned stock,
precio PB, envío rápido y almacén; tags/colecciones = revisión manual.
`detectConflicts` queda operativo para cuando el sync en vivo produzca
divergencias; ninguna se resuelve en silencio (test en verde).
