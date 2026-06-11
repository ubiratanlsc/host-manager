use super::constants::{MAX_PIPE_CHUNK_SIZE, READ_PAUSE_DURATION};
use super::{PtyExitPayload, PtyProcess, PtySpawnPayload, PtyStdoutPayload};
use crate::pty::constants::{PTY_EXIT_EVENT, PTY_SPAWN_EVENT, PTY_STDOUT_EVENT};
use crate::shell::SystemShell;
use crate::AppState;
use cuid2;
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::sync::atomic::{AtomicU64, Ordering};

static SPAWN_CALL_COUNTER: AtomicU64 = AtomicU64::new(0);
use tauri::{AppHandle, Emitter, State};
use tokio::sync::mpsc::channel;
use tokio::task::spawn_blocking;
use tokio::time::sleep;

#[tauri::command]
pub async fn spawn_pty(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    shell: SystemShell,
    cols: u16,
    rows: u16,
    spawn_id: String,
) -> Result<(), String> {
    let call_seq = SPAWN_CALL_COUNTER.fetch_add(1, Ordering::SeqCst);
    println!("[TAURI]: spawn_pty CALLED (seq={}, spawn_id={})", call_seq, spawn_id);

    // Anti-replay: verifica se este spawn_id já está associado a um PTY vivo.
    // Tauri reenvia a mesma invoke IPC idêntica após um reload da página.
    {
        let ptys = state.ptys.lock().await;
        if ptys.values().any(|pty| pty.spawn_id == spawn_id) {
            println!("[TAURI]: Rejected replayed spawn_pty (spawn_id={})", spawn_id);
            return Err("Duplicate spawn rejected (replayed command).".to_string());
        }
    }

    let id = cuid2::create_id();

    // Establish our new pty for the given size
    let pty_system = native_pty_system();
    let pty_pair = pty_system
        .openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|x| x.to_string())?;

    let pty_master = pty_pair.master;
    let pty_slave = pty_pair.slave;

    // Spawn our process within the pty
    let mut cmd = CommandBuilder::new(shell.command.clone());
    cmd.args(shell.args.clone());

    if let Some(dir) = shell.cwd.clone() {
        cmd.cwd(dir);
    }

    for (key, value) in shell.env.clone() {
        cmd.env(key, value)
    }

    let mut child = pty_slave.spawn_command(cmd).map_err(|x| x.to_string())?;

    // NOTE: Need to drop slave to close out file handles and avoid deadlock when waiting on the child
    drop(pty_slave);

    // Spawn a thread to wait input from frontend and write to the pty
    let (stdin_tx, mut stdin_rx) = channel::<Vec<u8>>(1);
    let mut stdin_writer = pty_master.take_writer().map_err(|x| x.to_string())?;

    let stdin_task = spawn_blocking(move || {
        while let Some(input) = stdin_rx.blocking_recv() {
            if stdin_writer.write_all(&input).is_err() {
                break;
            }
        }
    });

    // Spawn a thread to read from the pty and send the output to the frontend
    let mut stdout_reader = pty_master.try_clone_reader().map_err(|x| x.to_string())?;

    let app_handle_clone = app_handle.clone();
    let id_clone = id.clone();
    let stdout_task = spawn_blocking(move || {
        let mut buf: [u8; MAX_PIPE_CHUNK_SIZE] = [0; MAX_PIPE_CHUNK_SIZE];
        loop {
            match stdout_reader.read(&mut buf) {
                Ok(n) if n > 0 => {
                    app_handle_clone
                        .emit(
                            PTY_STDOUT_EVENT,
                            PtyStdoutPayload {
                                id: id_clone.clone(),
                                bytes: buf[..n].to_vec(),
                            },
                        )
                        .unwrap();
                }
                _ => {
                    break;
                }
            }
        }
    });

    // Wait for the child to exit and send the exit code to the frontend
    let (kill_tx, mut kill_rx) = channel::<()>(1);

    // Update the state with the new pty process
    {
        let mut ptys = state.ptys.lock().await;
        ptys.insert(
            id.clone(),
            PtyProcess {
                id: id.clone(),
                spawn_id: spawn_id.clone(),
                pty_master,
                stdin_tx,
                kill_tx,
                stdin_task,
                stdout_task,
                shell: shell.clone(),
            },
        );

        app_handle
            .emit(
                PTY_SPAWN_EVENT,
                PtySpawnPayload {
                    id: id.clone(),
                    shell: shell.clone(),
                },
            )
            .unwrap();

        println!("[TAURI]: Successfully spawned pty ({}).", id.clone());
    }

    loop {
        match (child.try_wait(), kill_rx.try_recv()) {
            (Ok(Some(status)), _) => {
                app_handle
                    .emit(
                        PTY_EXIT_EVENT,
                        PtyExitPayload {
                            id: id.clone(),
                            success: status.success(),
                            code: Some(status.exit_code()),
                        },
                    )
                    .unwrap();
                break;
            }

            (_, Ok(_)) => {
                // Mata o processo filho explicitamente (não confia só no drop do
                // pty_master) para garantir que o shell não fique órfão.
                let _ = child.kill();
                app_handle
                    .emit(
                        PTY_EXIT_EVENT,
                        PtyExitPayload {
                            id: id.clone(),
                            success: true,
                            code: None,
                        },
                    )
                    .unwrap();
                break;
            }

            (Err(_), _) => {
                app_handle
                    .emit(
                        PTY_EXIT_EVENT,
                        PtyExitPayload {
                            id: id.clone(),
                            success: false,
                            code: None,
                        },
                    )
                    .unwrap();
                break;
            }

            _ => {
                sleep(READ_PAUSE_DURATION).await;
                continue;
            }
        }
    }

    let mut ptys = state.ptys.lock().await;
    if let Some(pty) = ptys.remove(&id) {
        // Need to drop the stdin_tx to avoid deadlock when waiting on stdin_task
        drop(pty.stdin_tx);

        // Need to drop the kill_tx to drop also the kill_rx
        drop(pty.kill_tx);

        // Need to drop the pty_master to close out file handles and avoid deadlock when waiting on stdout_task
        drop(pty.pty_master);

        pty.stdin_task.await.unwrap();
        pty.stdout_task.await.unwrap();

        println!("[TAURI]: Successfully dropped pty ({}).", id.clone());
    }

    Ok(())
}

#[tauri::command]
pub async fn write_pty(
    state: State<'_, AppState>,
    id: String,
    data: String,
) -> Result<(), String> {
    let mut ptys = state.ptys.lock().await;

    let pty = ptys
        .get_mut(&id)
        .ok_or("[WRITE_PTY] The specified ID is not associated with any pty.")?;

    pty.stdin_tx
        .send(data.into_bytes())
        .await
        .map_err(|x| x.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn resize_pty(
    state: State<'_, AppState>,
    id: String,
    size: PtySize,
) -> Result<(), String> {
    let ptys = state.ptys.lock().await;

    let pty = ptys
        .get(&id)
        .ok_or("[RESIZE_PTY] The specified ID is not associated with any pty.")?;

    pty.pty_master.resize(size).map_err(|x| x.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn kill_pty(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let mut ptys = state.ptys.lock().await;

    let pty = ptys
        .get_mut(&id)
        .ok_or("[KILL_PTY] The specified ID is not associated with any pty.")?;

    pty.kill_tx.send(()).await.map_err(|x| x.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn kill_all_ptys(state: State<'_, AppState>) -> Result<(), String> {
    let ids = {
        let ptys = state.ptys.lock().await;
        ptys.keys().cloned().collect::<Vec<_>>()
    };

    for id in &ids {
        let mut ptys = state.ptys.lock().await;
        if let Some(pty) = ptys.get_mut(id) {
            let _ = pty.kill_tx.send(()).await;
        }
    }

    println!("[TAURI]: Killed {} PTY(s).", ids.len());
    Ok(())
}

#[tauri::command]
pub async fn list_ptys(state: State<'_, AppState>) -> Result<Vec<PtySpawnPayload>, String> {
    let ptys = state.ptys.lock().await;
    let mut result = Vec::new();

    for (_, pty) in ptys.iter() {
        result.push(PtySpawnPayload {
            id: pty.id.clone(),
            shell: pty.shell.clone(),
        });
    }

    println!("[TAURI]: list_ptys: {} sessões ativas", result.len());
    Ok(result)
}
