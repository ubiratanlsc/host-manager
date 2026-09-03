use serde::Serialize;
use std::fs::{create_dir_all, metadata, remove_file, rename, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

const LOG_FILE_NAME: &str = "terminal-diagnostics.log";
const ROTATED_LOG_FILE_NAME: &str = "terminal-diagnostics.log.1";
const MAX_LOG_BYTES: u64 = 2 * 1024 * 1024;
static LOG_LOCK: Mutex<()> = Mutex::new(());

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DiagnosticRecord<'a> {
    pub timestamp_ms: u128,
    pub terminal_id: &'a str,
    pub event: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stdout_events: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stdout_bytes: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_chunk_bytes: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub queued_bytes: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub queued_chunks: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exit_code: Option<u32>,
}

fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

fn format_record(record: &DiagnosticRecord<'_>) -> Result<String, serde_json::Error> {
    serde_json::to_string(record)
}

fn log_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    app_handle
        .path()
        .app_log_dir()
        .map(|directory| directory.join(LOG_FILE_NAME))
        .map_err(|error| format!("failed to resolve terminal diagnostic directory: {error}"))
}

fn rotate_if_needed(path: &Path) -> Result<(), String> {
    if metadata(path).map(|info| info.len()).unwrap_or(0) < MAX_LOG_BYTES {
        return Ok(());
    }

    let rotated = path.with_file_name(ROTATED_LOG_FILE_NAME);
    if rotated.exists() {
        remove_file(&rotated).map_err(|error| format!("failed to rotate terminal log: {error}"))?;
    }
    rename(path, rotated).map_err(|error| format!("failed to rotate terminal log: {error}"))
}

fn append_record(path: &Path, record: &DiagnosticRecord<'_>) -> Result<(), String> {
    let _guard = LOG_LOCK
        .lock()
        .map_err(|_| "terminal diagnostic log lock was poisoned".to_string())?;
    if let Some(parent) = path.parent() {
        create_dir_all(parent)
            .map_err(|error| format!("failed to create terminal log directory: {error}"))?;
    }
    rotate_if_needed(path)?;

    let line = format_record(record)
        .map_err(|error| format!("failed to serialize terminal diagnostic: {error}"))?;
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .map_err(|error| format!("failed to open terminal diagnostic log: {error}"))?;
    writeln!(file, "{line}")
        .map_err(|error| format!("failed to write terminal diagnostic log: {error}"))
}

pub(crate) fn write_backend_record(
    path: &Path,
    terminal_id: &str,
    event: &str,
    stdout_events: Option<u64>,
    stdout_bytes: Option<u64>,
    max_chunk_bytes: Option<u64>,
    exit_code: Option<u32>,
) {
    let _ = append_record(
        path,
        &DiagnosticRecord {
            timestamp_ms: now_ms(),
            terminal_id,
            event,
            stdout_events,
            stdout_bytes,
            max_chunk_bytes,
            queued_bytes: None,
            queued_chunks: None,
            exit_code,
        },
    );
}

pub(crate) fn resolve_log_path(app_handle: &AppHandle) -> Option<PathBuf> {
    log_path(app_handle).ok()
}

fn is_frontend_event_allowed(event: &str) -> bool {
    matches!(
        event,
        "renderer_backpressure" | "renderer_error" | "webgl_context_lost" | "input_mode_recovered"
    )
}

#[tauri::command]
pub fn log_terminal_diagnostic(
    app_handle: AppHandle,
    terminal_id: String,
    event: String,
    queued_bytes: Option<u64>,
    queued_chunks: Option<u64>,
) -> Result<(), String> {
    if !is_frontend_event_allowed(&event) {
        return Err("unsupported terminal diagnostic event".to_string());
    }

    let path = log_path(&app_handle)?;
    append_record(
        &path,
        &DiagnosticRecord {
            timestamp_ms: now_ms(),
            terminal_id: &terminal_id,
            event: &event,
            stdout_events: None,
            stdout_bytes: None,
            max_chunk_bytes: None,
            queued_bytes,
            queued_chunks,
            exit_code: None,
        },
    )
}

#[cfg(test)]
mod tests {
    use super::{format_record, is_frontend_event_allowed, DiagnosticRecord};

    #[test]
    fn diagnostic_record_contains_metadata_without_terminal_content() {
        let line = format_record(&DiagnosticRecord {
            timestamp_ms: 123,
            terminal_id: "pty-1",
            event: "stdout_sample",
            stdout_events: Some(7),
            stdout_bytes: Some(4096),
            max_chunk_bytes: Some(1024),
            queued_bytes: None,
            queued_chunks: None,
            exit_code: None,
        })
        .expect("record must serialize");
        let json: serde_json::Value = serde_json::from_str(&line).expect("valid JSON line");

        assert_eq!(json["terminalId"], "pty-1");
        assert_eq!(json["stdoutBytes"], 4096);
        assert!(json.get("content").is_none());
        assert!(json.get("stdin").is_none());
    }

    #[test]
    fn frontend_can_only_write_known_metadata_events() {
        assert!(is_frontend_event_allowed("renderer_backpressure"));
        assert!(is_frontend_event_allowed("renderer_error"));
        assert!(is_frontend_event_allowed("webgl_context_lost"));
        assert!(is_frontend_event_allowed("input_mode_recovered"));
        assert!(!is_frontend_event_allowed("typed-command-or-secret"));
    }
}
