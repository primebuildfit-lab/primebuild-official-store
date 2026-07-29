# 003E — Puerta del proveedor financiero

Flags vigentes (sellados por test): `pbExchangeV1Enabled=true` (UI/cotización
verificada) · **`pbExchangeMoneyModeEnabled=false`** con puerta documentada.
LIVE exige TODAS a la vez: proveedor configurado Y verificado + modo dinero +
dirección aprobada + anti-arbitraje sin bloqueo (getProviderState; test).
Sin proveedor: `provider_not_connected / QUOTE_TEST_ONLY`, fuente financiera
de verdad = ninguna; jamás se fabrica un balance local. Settled imposible sin
providerRef. Ningún despliegue de apps no relacionadas (Partnera/Eventra solo
verificadas por hash, sin tocar).
