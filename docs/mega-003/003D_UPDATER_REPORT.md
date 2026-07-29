# 003D — Informe del updater (investigación del fallo preexistente)

**RESUELTO EN MAIN.** El fallo `updater-channel.test` («only allowlisted files
name the release repository»), documentado como preexistente desde PAM/NIA-IOS,
ya NO existe: las consolidaciones paralelas (commits «Define the update channel
once…», «Record that the Official Store channel is now single-sourced», rollout
guard de canal) single-sourcearon el canal. Verificado hoy: 13/13 en el test y
178/178 en la suite completa de main `c361cbf`.

Pendiente que SIGUE siendo owner gate (no defecto): **backup verificado de las
claves de updater** (AP-9.3). La campaña Nexus 012/013 inventarió las 16 claves
reales (viven en directorios por-app del perfil) y dejó `signing-key-vault.ps1`
con SelfTest 9/9; faltan las USB y las passphrases del owner. Desde esta
campaña NO se rota ni se toca ninguna clave.
