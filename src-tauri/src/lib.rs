// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use std::collections::HashMap;
use tauri::Manager;
use tokio::sync::Mutex;

use crate::pty::PtyProcess;

mod pty;
mod shell;
mod ssh;

pub struct AppState {
    ptys: Mutex<HashMap<String, PtyProcess>>,
    ssh_sessions: Mutex<HashMap<String, ssh::SshSession>>,
    pending_hostkey: Mutex<HashMap<String, tokio::sync::oneshot::Sender<bool>>>,
}

impl AppState {
    fn new() -> Self {
        Self {
            ptys: Mutex::new(HashMap::new()),
            ssh_sessions: Mutex::new(HashMap::new()),
            pending_hostkey: Mutex::new(HashMap::new()),
        }
    }
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

    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_system_fonts::init())
        .manage(AppState::new())
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
