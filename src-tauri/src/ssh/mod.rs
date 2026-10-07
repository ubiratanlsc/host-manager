use serde::{Deserialize, Serialize};
use ssh2::Session;
use std::net::TcpStream;
use std::sync::mpsc as std_mpsc;
use std::sync::Arc;
use std::sync::Mutex as StdMutex;
use std::time::{Duration, Instant};
use tauri::{AppHandle, State};
use tokio::task::JoinHandle;
pub mod commands;
mod constants;
mod io_buffer;

pub use constants::*;

#[derive(Serialize, Deserialize, Clone)]
pub struct SshSpawnPayload {
    pub id: String,
    pub host: String,
    pub port: u16,
    pub username: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct SshStdoutPayload {
    pub id: String,
    pub bytes: Vec<u8>,
    // #[serde(skip_serializing_if = "Option::is_none")]
    // exit_code: Option<i32>, // Novo campo
}

#[derive(Serialize, Deserialize, Clone)]
pub struct SshExitPayload {
    pub id: String,
    pub success: bool,
    pub code: Option<i32>,
}

/// Comandos enviados à thread de I/O da sessão. Toda operação no canal
/// (escrita, leitura, resize, close) acontece nessa única thread: o libssh2
/// em modo não-bloqueante não tolera chamadas intercaladas de threads
/// diferentes enquanto um pacote está parcialmente enviado.
pub enum SshCommand {
    Data(Vec<u8>),
    Resize {
        cols: u32,
        rows: u32,
        width_px: Option<u32>,
        height_px: Option<u32>,
    },
    Close,
}

pub struct SshSession {
    pub id: String,
    window_id: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    cmd_tx: std_mpsc::Sender<SshCommand>,
    io_task: JoinHandle<()>,
    // `false` assim que a thread de I/O encerra (desconexão ou kill).
    pub connected: Arc<StdMutex<bool>>,
}

impl SshSession {
    /// Encerra a sessão de forma graciosa: pede à thread de I/O que envie
    /// EOF/close ao servidor (para o sshd liberar a sessão) e espera um pouco
    /// por ela. Consome `self`. Bloqueia por até ~1s, então use em contexto
    /// bloqueante (ex.: `spawn_blocking` ou no fechamento do app).
    pub fn shutdown(self) {
        let _ = self.cmd_tx.send(SshCommand::Close);
        let deadline = Instant::now() + Duration::from_secs(1);
        while !self.io_task.is_finished() && Instant::now() < deadline {
            std::thread::sleep(Duration::from_millis(10));
        }
        if !self.io_task.is_finished() {
            self.io_task.abort();
        }
    }
}
