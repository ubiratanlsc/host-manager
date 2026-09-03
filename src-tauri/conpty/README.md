# Bundled Microsoft ConPTY

Windows builds bundle the matched x64 pair from
`Microsoft.Windows.Console.ConPTY.1.24.260402001.nupkg`, published with
Windows Terminal `v1.24.10921.0`.

- Source: https://github.com/microsoft/terminal/releases/tag/v1.24.10921.0
- License: MIT
- `OpenConsole.exe` SHA-256: `CC557520C04A2BBDA4909292E5E8929C7DB38CA195DE60E2548DEE78E07D84BD`
- `conpty.dll` SHA-256: `AEEE2BE15A78A0E8244496E8563E473F626D754297093D3B94934A1DB4FB26FA`

Keep these files as a matched pair. `portable-pty` prefers a `conpty.dll`
beside the application and that DLL launches the matching `OpenConsole.exe`.
