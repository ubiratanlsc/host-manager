use rusqlite::{params, Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Serialize, Deserialize, Debug)]
struct Task {
    id: Option<i64>,
    nome: String,
    completed: bool,
}
struct Pass {
    id: Option<i64>,
    nome: String,
    completed: bool,
}

struct AppState {
    db_conn: Mutex<Connection>,
}
