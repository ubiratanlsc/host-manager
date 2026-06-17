use std::process::Command;

/// Lança um programa externo com argumentos, diretório de trabalho e opções.
///
/// - `path`: caminho do executável (ex.: `C:\Program Files\WinSCP\WinSCP.exe`)
/// - `args`: argumentos já tokenizados e com variáveis substituídas
/// - `cwd`: working directory (opcional)
/// - `elevated`: no Windows, executa via UAC (`Start-Process -Verb RunAs`)
/// - `wait`: aguarda o processo terminar antes de retornar
#[tauri::command]
pub async fn launch_external_tool(
    path: String,
    args: Vec<String>,
    cwd: Option<String>,
    elevated: bool,
    wait: bool,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || run_tool(path, args, cwd, elevated, wait))
        .await
        .map_err(|e| format!("falha ao agendar processo: {e}"))?
}

fn run_tool(
    path: String,
    args: Vec<String>,
    cwd: Option<String>,
    elevated: bool,
    wait: bool,
) -> Result<(), String> {
    let cwd = cwd.filter(|c| !c.trim().is_empty());

    #[cfg(windows)]
    if elevated {
        return run_elevated_windows(&path, &args, cwd.as_deref(), wait);
    }
    #[cfg(not(windows))]
    let _ = elevated; // elevação só implementada no Windows

    let mut cmd = Command::new(&path);
    cmd.args(&args);
    if let Some(dir) = &cwd {
        cmd.current_dir(dir);
    }

    if wait {
        let status = cmd
            .status()
            .map_err(|e| format!("falha ao executar '{path}': {e}"))?;
        if !status.success() {
            return Err(format!("'{path}' terminou com código {:?}", status.code()));
        }
    } else {
        cmd.spawn()
            .map_err(|e| format!("falha ao iniciar '{path}': {e}"))?;
    }
    Ok(())
}

/// Executa elevado no Windows via `Start-Process -Verb RunAs` (dispara o UAC).
#[cfg(windows)]
fn run_elevated_windows(
    path: &str,
    args: &[String],
    cwd: Option<&str>,
    wait: bool,
) -> Result<(), String> {
    let mut ps = format!("Start-Process -FilePath '{}'", ps_quote(path));

    if !args.is_empty() {
        let list = args
            .iter()
            .map(|a| format!("'{}'", ps_quote(a)))
            .collect::<Vec<_>>()
            .join(",");
        ps.push_str(&format!(" -ArgumentList {list}"));
    }
    if let Some(dir) = cwd {
        ps.push_str(&format!(" -WorkingDirectory '{}'", ps_quote(dir)));
    }
    ps.push_str(" -Verb RunAs");
    if wait {
        ps.push_str(" -Wait");
    }

    let status = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", &ps])
        .status()
        .map_err(|e| format!("falha ao elevar: {e}"))?;

    if !status.success() {
        return Err("execução elevada foi cancelada ou falhou".to_string());
    }
    Ok(())
}

/// Escapa aspas simples para uso dentro de string PowerShell entre aspas simples.
#[cfg(windows)]
fn ps_quote(s: &str) -> String {
    s.replace('\'', "''")
}
