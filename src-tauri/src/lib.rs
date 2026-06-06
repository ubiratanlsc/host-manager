// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use std::collections::HashMap;
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
            ssh::commands::spawn_ssh,
            ssh::commands::write_ssh,
            ssh::commands::resize_ssh,
            ssh::commands::kill_ssh,
            ssh::commands::list_ssh_sessions,
            ssh::commands::respond_hostkey,
            ssh::commands::cleanup_inactive_sessions,
            ssh::commands::heartbeat,
            ssh::commands::shutdown_all_sessions,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
