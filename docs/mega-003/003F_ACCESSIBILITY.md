# 003F — Accesibilidad

- **Reduced motion**: añadido `@media (prefers-reduced-motion: reduce)` al CSS
  del clon (monedas sin animación; zooms/transiciones desactivados). El theme
  real NO lo tiene — mejora deliberada sin romper paridad visual estática.
- **Teclado/focus**: navegación por enlaces/botones nativos (dropdowns por
  hover Y enlaces reales navegables; menú móvil `<details>/<summary>` operable
  por teclado, herencia del diseño zero-JS del theme). Inputs con aria-label
  (cantidad, buscador, email).
- **Lectores**: landmarks (`header/nav/main/footer`), headings jerárquicos
  (h1 por página), `aria-label` en iconos, `role=dialog aria-modal` en el
  modal de bienvenida, alt en imágenes de producto.
- **No color-only**: estados de stock/badges llevan texto, no solo color.
- **Zoom**: unidades relativas + max-widths; verificado sin overflow a 320px.
- Pendiente razonable (registrado): trap de foco dentro del modal y skip-link;
  no bloquean el prototipo.
