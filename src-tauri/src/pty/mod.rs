use crate::shell::SystemShell;
use portable_pty::MasterPty;
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc::Sender;
use tokio::task::JoinHandle;

pub mod commands;
mod constants;

#[derive(Serialize, Deserialize, Clone)]
struct PtyStdoutPayload {
    id: String,
    bytes: Vec<u8>,
}

#[derive(Serialize, Deserialize, Clone)]
struct PtyExitPayload {
    id: String,
    success: bool,
    code: Option<u32>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct PtySpawnPayload {
    pub id: String,
    pub shell: SystemShell,
}

pub struct PtyProcess {
    pub id: String,
    pub spawn_id: String,
    pub pty_master: Box<dyn MasterPty + Send>,
    pub stdin_tx: Sender<Vec<u8>>,
    pub kill_tx: Sender<()>,
    pub stdin_task: JoinHandle<()>,
    pub stdout_task: JoinHandle<()>,
    pub shell: SystemShell,
}
