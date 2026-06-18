//! Integração com o menu de contexto do Windows ("Abrir no host-manager").
//!
//! O instalador (NSIS) registra um verbo no Explorer cujo comando é
//! `host-manager.exe --open-here "<pasta>"`. Este módulo extrai esse caminho
//! do argv e o entrega ao frontend, que abre um terminal local na pasta.
//!
//! Dois fluxos:
//! - **Cold start**: o app é iniciado pelo menu de contexto. O caminho é lido
//!   do argv na inicialização e guardado em `AppState::pending_open_here`. O
//!   frontend drena esse valor uma única vez via [`take_open_here_path`].
//! - **Warm start**: o app já está aberto. O `single-instance` repassa o argv
//!   da segunda instância para [`handle_second_instance`], que emite o evento
//!   [`OPEN_HERE_EVENT`] e traz a janela para frente.

use crate::AppState;
use tauri::{AppHandle, Emitter, Manager, State};

/// Evento emitido ao frontend com o caminho da pasta a abrir.
pub const OPEN_HERE_EVENT: &str = "EVENTS:OPEN_HERE";

const OPEN_HERE_FLAG: &str = "--open-here";
const OPEN_HERE_FLAG_EQ: &str = "--open-here=";

/// Extrai o caminho passado via `--open-here <pasta>` ou `--open-here=<pasta>`.
pub fn extract_path(args: &[String]) -> Option<String> {
    let mut iter = args.iter();
    while let Some(arg) = iter.next() {
        if arg == OPEN_HERE_FLAG {
            return iter
                .next()
                .map(|p| p.trim().to_string())
                .filter(|p| !p.is_empty());
        }
        if let Some(rest) = arg.strip_prefix(OPEN_HERE_FLAG_EQ) {
            let value = rest.trim().to_string();
            if !value.is_empty() {
                return Some(value);
            }
        }
    }
    None
}

/// Lê o caminho de `--open-here` dos argumentos do processo atual (cold start).
pub fn path_from_current_args() -> Option<String> {
    let args: Vec<String> = std::env::args().collect();
    extract_path(&args)
}

/// O frontend drena o caminho inicial (cold start) uma única vez na inicialização.
#[tauri::command]
pub async fn take_open_here_path(state: State<'_, AppState>) -> Result<Option<String>, String> {
    let mut pending = state.pending_open_here.lock().await;
    Ok(pending.take())
}

/// Callback do `single-instance`: app já rodando recebe o argv da nova instância.
/// Emite o evento com a pasta e traz a janela principal para frente.
pub fn handle_second_instance(app: &AppHandle, args: &[String]) {
    if let Some(path) = extract_path(args) {
        let _ = app.emit(OPEN_HERE_EVENT, path);
    }

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extrai_caminho_com_flag_separada() {
        let args = vec![
            "host-manager.exe".to_string(),
            "--open-here".to_string(),
            "C:\\Projetos\\app".to_string(),
        ];
        assert_eq!(extract_path(&args), Some("C:\\Projetos\\app".to_string()));
    }

    #[test]
    fn extrai_caminho_com_flag_igual() {
        let args = vec![
            "host-manager.exe".to_string(),
            "--open-here=C:\\Projetos\\app".to_string(),
        ];
        assert_eq!(extract_path(&args), Some("C:\\Projetos\\app".to_string()));
    }

    #[test]
    fn retorna_none_sem_flag() {
        let args = vec!["host-manager.exe".to_string()];
        assert_eq!(extract_path(&args), None);
    }

    #[test]
    fn retorna_none_com_flag_sem_valor() {
        let args = vec!["host-manager.exe".to_string(), "--open-here".to_string()];
        assert_eq!(extract_path(&args), None);
    }

    #[test]
    fn ignora_valor_vazio() {
        let args = vec![
            "host-manager.exe".to_string(),
            "--open-here".to_string(),
            "   ".to_string(),
        ];
        assert_eq!(extract_path(&args), None);
    }
}
