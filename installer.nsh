!macro customInit
  !insertmacro GetDParameter $R0
  ${if} $R0 != ""
    StrCpy $INSTDIR $R0
  ${else}
    ${if} ${RunningX64}
      StrCpy $INSTDIR "$PROGRAMFILES64\SnapMind AI"
    ${else}
      StrCpy $INSTDIR "$PROGRAMFILES\SnapMind AI"
    ${endif}
  ${endif}
!macroend
