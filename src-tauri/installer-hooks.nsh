; PrimeBuild Official Store — NSIS installer hooks.
;
; Start Menu shortcut migration (audit PB-C-001 / A-4).
;
; The convention is a per-brand folder: "Ecosistema\PrimeBuild". Earlier builds
; put the shortcut elsewhere, and a passive auto-update recreates a shortcut
; without removing the one the previous layout left behind — so machines end up
; with the same app listed twice.
;
; Configuring startMenuFolder only fixes NEW installs. These hooks clean up the
; shortcuts already on disk.
;
; SAFETY RULES (each one is covered by tests/desktop/installer-hooks.test.ts):
;   * Only the exact file name of THIS product is ever deleted. In particular,
;     PrimeBuild Internal OS lives in the same folder and is a different app;
;     CoinOS, priembuild-core, Eventra, Partnera and Platform Nexus shortcuts
;     share these directories and must never be touched.
;   * Never delete a directory. "Ecosistema" holds other brands' shortcuts.
;   * Idempotent: Delete on a missing file is a no-op, so re-running an install
;     or an update changes nothing.
;   * Never fatal: a locked or missing file logs a warning and installation
;     continues. Losing a shortcut must not lose an installation.
;
; The helper is defined before the hooks because NSIS resolves !insertmacro at
; parse time. Each call passes an explicit unique Id: labels are global in NSIS,
; so two expansions sharing one label would fail to compile.

!macro PB_RemoveLegacyShortcut Id Path
  IfFileExists "${Path}" pb_do_${Id} pb_end_${Id}
  pb_do_${Id}:
    ClearErrors
    Delete "${Path}"
    IfErrors pb_warn_${Id} pb_ok_${Id}
  pb_warn_${Id}:
    DetailPrint "PrimeBuild: aviso — no se pudo eliminar ${Path} (la instalación continúa)"
    Goto pb_end_${Id}
  pb_ok_${Id}:
    DetailPrint "PrimeBuild: acceso antiguo eliminado — ${Path}"
  pb_end_${Id}:
!macroend

!macro NSIS_HOOK_POSTINSTALL
  DetailPrint "PrimeBuild: consolidando accesos del menú Inicio…"
  !insertmacro PB_RemoveLegacyShortcut inst_root "$SMPROGRAMS\PrimeBuild Official Store.lnk"
  !insertmacro PB_RemoveLegacyShortcut inst_eco "$SMPROGRAMS\Ecosistema\PrimeBuild Official Store.lnk"
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ; Uninstalling must not leave orphans behind at the historical locations.
  !insertmacro PB_RemoveLegacyShortcut uninst_root "$SMPROGRAMS\PrimeBuild Official Store.lnk"
  !insertmacro PB_RemoveLegacyShortcut uninst_eco "$SMPROGRAMS\Ecosistema\PrimeBuild Official Store.lnk"
!macroend
