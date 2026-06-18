; Hooks do instalador NSIS do host-manager.
;
; Registra (opcionalmente) o verbo "Abrir no host-manager" no menu de contexto
; do Windows Explorer, em HKCU (nao exige privilegio de administrador).
;
; O usuario decide na instalacao interativa via MessageBox. Um marcador em
; HKCU\Software\host-manager\ContextMenu preserva a escolha entre atualizacoes
; silenciosas (o updater roda instalador/desinstalador em modo silencioso).

!macro NSIS_HOOK_POSTINSTALL
  IfSilent hook_ctx_silent hook_ctx_interactive

  hook_ctx_interactive:
    MessageBox MB_YESNO|MB_ICONQUESTION "Adicionar 'Abrir no host-manager' ao menu de contexto do Explorer?$\n$\nPermite abrir um terminal local em qualquer pasta com o botao direito do mouse." IDNO hook_ctx_optout
      WriteRegStr HKCU "Software\host-manager" "ContextMenu" "1"
      Goto hook_ctx_write
    hook_ctx_optout:
      DeleteRegValue HKCU "Software\host-manager" "ContextMenu"
      Goto hook_ctx_end

  hook_ctx_silent:
    ; Atualizacao silenciosa: so reescreve as chaves se o usuario ja optou antes.
    ReadRegStr $0 HKCU "Software\host-manager" "ContextMenu"
    StrCmp $0 "1" hook_ctx_write hook_ctx_end

  hook_ctx_write:
    ; Pasta selecionada (clique direito sobre uma pasta)
    WriteRegStr HKCU "Software\Classes\Directory\shell\OpenInHostManager" "" "Abrir no host-manager"
    WriteRegStr HKCU "Software\Classes\Directory\shell\OpenInHostManager" "Icon" "$INSTDIR\host-manager.exe"
    WriteRegStr HKCU "Software\Classes\Directory\shell\OpenInHostManager\command" "" '"$INSTDIR\host-manager.exe" --open-here "%V"'
    ; Fundo da pasta (clique direito no espaco vazio dentro de uma pasta aberta)
    WriteRegStr HKCU "Software\Classes\Directory\Background\shell\OpenInHostManager" "" "Abrir no host-manager"
    WriteRegStr HKCU "Software\Classes\Directory\Background\shell\OpenInHostManager" "Icon" "$INSTDIR\host-manager.exe"
    WriteRegStr HKCU "Software\Classes\Directory\Background\shell\OpenInHostManager\command" "" '"$INSTDIR\host-manager.exe" --open-here "%V"'
  hook_ctx_end:
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ; Em desinstalacao silenciosa (atualizacao) preserva o menu de contexto.
  ; Numa desinstalacao real (interativa) remove tudo.
  IfSilent hook_unctx_end
    DeleteRegKey HKCU "Software\Classes\Directory\shell\OpenInHostManager"
    DeleteRegKey HKCU "Software\Classes\Directory\Background\shell\OpenInHostManager"
    DeleteRegValue HKCU "Software\host-manager" "ContextMenu"
    DeleteRegKey /ifempty HKCU "Software\host-manager"
  hook_unctx_end:
!macroend
