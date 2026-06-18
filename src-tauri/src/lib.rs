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
            ssh::commands::spawn_ssh,
            ssh::commands::write_ssh,
            ssh::commands::resize_ssh,
            ssh::commands::kill_ssh,
            ssh::commands::list_ssh_sessions,
            ssh::commands::respond_hostkey,
            ssh::commands::shutdown_all_sessions,
            check_host_connectivity,
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
                        for (_, pty) in ptys.iter() {
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
