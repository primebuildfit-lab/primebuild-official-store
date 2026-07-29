# 003E — Inmutabilidad del perfil legado

Verificado en contrato y runtime: PB_LEGACY_POINTS conserva balances, historia,
reglas, etiquetas e integraciones; `mutableFromSdk=false` en ambos perfiles;
NINGUNA ruta de conversión existe en el SDK ni en las UIs; la página «Puntos
legados» (CoinOS instalado 0.3.0, ruta 200) enumera las garantías y enlaza al
perfil legado (/pb-coin, /rewards). Los modelos Prisma Pb* son PARALELOS a
PbCoinConfig (BD jamás aplicada — sin datos que migrar).
