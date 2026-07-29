# 003F — Clean profile y golden path

- **Golden path completo**: test integral determinista con módulos de producción
  y datos reales del catálogo (mirror ACTIVE → recepción → público → precio
  PB/USD → carrito → reserva → oversell concurrente bloqueado → quote checkout
  → pago observado (fixture) → pedido → picking → envío (ledger a 0 disponible)
  → producto se oculta → devolución → política de inventario) — 3/3 en verde,
  más la supervisión del Internal OS certificada en 003D.
- **Data root limpio**: la instalada usa su propio árbol (`%LOCALAPPDATA%`);
  el mirror escribe `.data/` bajo el server-dist instalado; localStorage del
  webview parte vacío ⇒ estados honestos (verificado en 0.1.10: espejo vacío
  honesto hasta cargar snapshot etiquetado).
- **Sin dependencia de worktree**: el sidecar instalado es standalone (payload
  empaquetado; el snapshot va como import de módulo precisamente para esto).
  Runtime verificado sin tocar D:\empresas.
- **Sin secretos, sin stock inventado**: credenciales ausentes = estados
  Authentication required; el stock solo nace de recepciones.
