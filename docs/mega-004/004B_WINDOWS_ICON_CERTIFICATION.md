# 004B — Certificación de iconos Windows (tras instalar 0.1.12 / 0.1.10)

| Superficie | Official Store 0.1.12 | Internal OS 0.1.10 | Evidencia |
|---|---|---|---|
| Recurso del EXE | chevron aprobado | **chevron aprobado (nuevo)** | icon-cert-exe-*.png (extraído del binario) |
| Ventana (title bar) | ✓ | ✓ | icon-cert-fullscreen.png (ambas ventanas) |
| Instalador NSIS | icono del set regenerado | icono del set regenerado | recursos src-tauri/icons commiteados |
| Menú Inicio / acceso directo | hereda del exe certificado | hereda del exe certificado | convención NSIS (icono = exe) |
| Alt+Tab / taskbar | derivan del icono de ventana/exe certificado | ídem | taskbar con auto-ocultar en esta máquina (franja capturada vacía); el origen del icono está certificado en exe+ventana |
| Caché de iconos | sin refresco necesario (ambos exes muestran el icono correcto al extraer) | ídem | extracción directa |

Rechazados comprobados: NO hay icono genérico de Tauri ni de Windows, NO hay
icono en blanco, NO queda el icono viejo del Internal OS (sustituido por el
porte 0d41029 del rebrand aprobado).
