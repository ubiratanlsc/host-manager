use serde::{Deserialize, Serialize};
use ssh2::{Channel, Session};
use std::io::Write;
use std::net::TcpStream;
use std::sync::Arc;
use std::sync::Mutex as StdMutex;
use std::time::SystemTime;
use tauri::{AppHandle, State};
use tokio::sync::mpsc;
use tokio::task::JoinHandle;
pub mod commands;
mod constants;

pub use commands::*;
pub use constants::*;

#[derive(Serialize, Deserialize, Clone)]
pub struct SshSpawnPayload {
    pub id: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    #[serde(skip_serializing)] // Não expor a senha nos eventos
    pub password: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct SshStdoutPayload {
    pub id: String,
    pub bytes: Vec<u8>,
    // #[serde(skip_serializing_if = "Option::is_none")]
    // exit_code: Option<i32>, // Novo campo
}

#[derive(Serialize, Deserialize, Clone)]
struct SshStdinPayload {
    id: String,
    bytes: Vec<u8>,
    success: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct SshExitPayload {
    pub id: String,
    pub success: bool,
    pub code: Option<i32>,
}

pub struct SshSession {
    pub id: String,
    window_id: String,
    channel: Arc<StdMutex<Channel>>,
    stdin_tx: mpsc::Sender<Vec<u8>>,
    stdin_task: JoinHandle<()>,
    stdout_task: JoinHandle<()>,
    last_activity: Arc<StdMutex<SystemTime>>,
    pub heartbeat: Arc<StdMutex<SystemTime>>,
    pub connected: Arc<StdMutex<bool>>,
}
