// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use std::collections::HashMap;
use std::time::Duration;
use tauri::Manager;
use tokio::sync::Mutex;

use crate::pty::PtyProcess;

mod external_tools;
mod open_here;
mod pty;
mod shell;
mod ssh;

pub struct AppState {
    ptys: Mutex<HashMap<String, PtyProcess>>,
    ssh_sessions: Mutex<HashMap<String, ssh::SshSession>>,
    pending_hostkey: Mutex<HashMap<String, tokio::sync::oneshot::Sender<bool>>>,
    /// Caminho passado via `--open-here` no cold start, drenado pelo frontend.
    pending_open_here: Mutex<Option<String>>,
}

impl AppState {
    fn new(pending_open_here: Option<String>) -> Self {
        Self {
            ptys: Mutex::new(HashMap::new()),
            ssh_sessions: Mutex::new(HashMap::new()),
            pending_hostkey: Mutex::new(HashMap::new()),
            pending_open_here: Mutex::new(pending_open_here),
        }
    }
}

#[tauri::command]
async fn check_host_connectivity(host: String, port: u16) -> bool {
    tokio::task::spawn_blocking(move || {
        use std::net::{TcpStream, ToSocketAddrs};
        let addr = format!("{}:{}", host, port);
        let sock_addr = match addr.to_socket_addrs().ok().and_then(|mut a| a.next()) {
            Some(a) => a,
            None => return false,
        };
        TcpStream::connect_timeout(&sock_addr, Duration::from_secs(3)).is_ok()
    })
    .await
    .unwrap_or(false)
}

#[derive(serde::Serialize)]
struct SshConfigFile {
    path: String,
    home: String,
    contents: String,
}

/// Lê um arquivo no formato ~/.ssh/config para a importação de hosts.
/// Sem `path`, usa o padrão `<home>/.ssh/config`.
#[tauri::command]
async fn read_ssh_config(path: Option<String>) -> Result<SshConfigFile, String> {
    const MAX_SIZE: u64 = 1024 * 1024;

    #[cfg(target_os = "windows")]
    let home = std::env::var("USERPROFILE").unwrap_or_default();
    #[cfg(not(target_os = "windows"))]
    let home = std::env::var("HOME").unwrap_or_default();

    let path = match path.filter(|p| !p.trim().is_empty()) {
        Some(p) => std::path::PathBuf::from(p),
        None if !home.is_empty() => std::path::Path::new(&home).join(".ssh").join("config"),
        None => return Err("Não foi possível localizar a pasta do usuário".to_string()),
    };

    let metadata = std::fs::metadata(&path)
        .map_err(|e| format!("Não foi possível abrir {}: {}", path.display(), e))?;
    if !metadata.is_file() {
        return Err(format!("{} não é um arquivo", path.display()));
    }
    if metadata.len() > MAX_SIZE {
        return Err(format!("{} é grande demais para ser um ssh config", path.display()));
    }
    let bytes = std::fs::read(&path)
        .map_err(|e| format!("Não foi possível ler {}: {}", path.display(), e))?;

    Ok(SshConfigFile {
        path: path.display().to_string(),
        home,
        contents: String::from_utf8_lossy(&bytes).into_owned(),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // let storage = match ui::commands::init_storage() {
    //     Ok(storage) => storage,
    //     Err(e) => {
    //         eprintln!("Erro ao inicializar armazenamento: {:?}", e);
    //         std::process::exit(1);
    //     }
    // };

    // Caminho do menu de contexto do Windows ("Abrir no host-manager") quando
    // o app é iniciado já a partir de uma pasta (cold start).
    let pending_open_here = open_here::path_from_current_args();

    tauri::Builder::default()
        // O single-instance DEVE ser o primeiro plugin registrado. Garante uma
        // única janela: uma segunda invocação (ex.: outro "Abrir no host-manager")
        // é repassada para a instância viva em vez de abrir outra janela.
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            open_here::handle_second_instance(app, &args);
        }))
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_system_fonts::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;
            Ok(())
        })
        .manage(AppState::new(pending_open_here))
        .invoke_handler(tauri::generate_handler![
            shell::commands::get_system_shells,
            pty::commands::spawn_pty,
            pty::commands::write_pty,
            pty::commands::resize_pty,
            pty::commands::kill_pty,
            pty::commands::kill_all_ptys,
            pty::commands::list_ptys,
            pty::diagnostics::log_terminal_diagnostic,
            ssh::commands::spawn_ssh,
            ssh::commands::write_ssh,
            ssh::commands::resize_ssh,
            ssh::commands::kill_ssh,
            ssh::commands::list_ssh_sessions,
            ssh::commands::respond_hostkey,
            ssh::commands::shutdown_all_sessions,
            check_host_connectivity,
            read_ssh_config,
            external_tools::launch_external_tool,
            open_here::take_open_here_path,
        ])
        .on_window_event(|window, event| {
            // Ao fechar a janela: encerra PTYs locais e desconecta as sessões SSH
            // de forma graciosa (envia EOF/close ao servidor) para o sshd liberar
            // os recursos imediatamente, em vez de esperar o timeout de TCP.
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let state = window.state::<AppState>();
                tauri::async_runtime::block_on(async move {
                    {
                        let ptys = state.ptys.lock().await;
                        for pty in ptys.values() {
                            let _ = pty.kill_tx.send(()).await;
                        }
                    }

                    let sessions: Vec<ssh::SshSession> = {
                        let mut ssh_sessions = state.ssh_sessions.lock().await;
                        ssh_sessions.drain().map(|(_, s)| s).collect()
                    };
                    for session in sessions {
                        session.shutdown();
                    }
                });
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
