# 004G — Seguridad (delta nocturno)

Sin regresiones sobre 003F (informe completo: docs/mega-003/003F_SECURITY_REPORT.md).
Delta de esta campaña: el wizard exige evidencia para recepciones no-DEMO,
etiqueta DEMO en el motivo (no hay stock fantasma sin marca) y su reversa es
compensatoria (no borra). Las 10 páginas nuevas son estáticas o derivadas del
mirror (mismo sanitizado XSS); Order Status solo lee pedidos locales.
