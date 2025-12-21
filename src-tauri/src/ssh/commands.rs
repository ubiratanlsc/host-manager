use super::*;
use crate::JexpeState;
use cuid::cuid;
use portable_pty::PtySize;
use ssh2::KeyboardInteractivePrompt;
use std::sync::Arc;
use std::sync::Mutex as StdMutex;
use std::thread;
use std::{io::Read, path::Path};
use tauri::Emitter;
use tokio::sync::mpsc;
use std::time::Duration;

struct PasswordPrompt(String);

impl KeyboardInteractivePrompt for PasswordPrompt {
    fn prompt<'a>(
        &mut self,
        _username: &str,
        _instructions: &str,
        prompts: &[ssh2::Prompt<'a>],
    ) -> Vec<String> {
        println!("ponto: 1 - Recebido prompt interativo");
        prompts.iter().map(|_| self.0.clone()).collect()
    }
}

fn authenticate(
    sess: &mut Session,
    username: &str,
    password: &Option<String>,
) -> Result<(), String> {
    println!("ponto: 2 - Iniciando autenticação");

    if let Some(pass) = password {
        println!("ponto: 3 - Tentando autenticação por senha");
        sess.userauth_password(username, pass)
            .or_else(|_| {
                println!("ponto: 4 - Fallback para autenticação interativa");
                let mut prompt = PasswordPrompt(pass.clone());
                sess.userauth_keyboard_interactive(username, &mut prompt)
            })
            .map_err(|e| format!("Authentication failed: {}", e))?;
    } else {
        println!("ponto: 5 - Tentando autenticação por chave");
        sess.userauth_agent(username)
            .or_else(|_| {
                println!("ponto: 6 - Tentando caminhos padrão de chaves SSH");
                let home = std::env::var("HOME")
                    .map_err(|_| ssh2::Error::from_errno(ssh2::ErrorCode::Session(-1)))?;
                let private_key = Path::new(&home).join(".ssh/id_rsa");
                let public_key = private_key.with_extension("pub");

                sess.userauth_pubkey_file(username, Some(&public_key), &private_key, None)
            })
            .map_err(|e| format!("Authentication failed: {}", e))?;
    }
    println!("ponto: 7 - Autenticação bem-sucedida");
    Ok(())
}

#[tauri::command]
pub async fn spawn_ssh(
    app_handle: AppHandle,
    state: State<'_, JexpeState>,
    window_id: String,
    host: String,
    port: u16,
    username: String,
    password: Option<String>,
) -> Result<String, String> {
    println!("ponto: 8 - Iniciando spawn_ssh para window: {}", window_id);

    // Verificar se já existe uma sessão para esta janela
    {
        let ssh_sessions = state.ssh_sessions.lock().await;
        for (_, session) in ssh_sessions.iter() {
            if session.window_id == window_id {
                return Err("Já existe uma sessão SSH para esta janela".to_string());
            }
        }
    }

    let id = cuid().map_err(|_| "Failed to generate ID")?;

    let tcp = TcpStream::connect((host.as_str(), port)).map_err(|e| e.to_string())?;

    let mut sess = Session::new().map_err(|e| e.to_string())?;

    sess.set_tcp_stream(tcp);
    sess.handshake().map_err(|e| e.to_string())?;

    authenticate(&mut sess, &username, &password)?;

    let mut channel = sess.channel_session().map_err(|e| e.to_string())?;

    // Configurar o canal apropriadamente
    let mut term_modes = ssh2::PtyModes::new();
    term_modes.set_u32(ssh2::PtyModeOpcode::ECHO, 0); // Desabilita echo
                                                      // term_modes.set_u32(ssh2::PtyModeOpcode::ECHOE, 0); // Desabilita erase
                                                      // term_modes.set_u32(ssh2::PtyModeOpcode::ECHOK, 0); // Desabilita kill
                                                      // term_modes.set_u32(ssh2::PtyModeOpcode::ECHONL, 0); // Desabilita newline echo
                                                      // term_modes.set_u32(ssh2::PtyModeOpcode::ECHOCTL, 0); // Desabilita echo de controles
                                                      // term_modes.set_u32(ssh2::PtyModeOpcode::ICRNL, 1); // Converte CR para NL na entrada
                                                      // term_modes.set_u32(ssh2::PtyModeOpcode::ONLCR, 1); // Mapeia NL para CR-NL na saída
                                                      // term_modes.set_u32(ssh2::PtyModeOpcode::OPOST, 1);

    channel
        // .request_pty("xterm", None, None)
        // .request_pty("xterm", Some(term_modes), None)
        // .map_err(|e| e.to_string())?;
        .request_pty("xterm-256color", Some(term_modes), None)
        .map_err(|e| e.to_string())?;

    channel.shell().map_err(|e| e.to_string())?;

    // Configurar modo não-bloqueante
    sess.set_blocking(false);

    let channel = Arc::new(StdMutex::new(channel));
    let (stdin_tx, mut stdin_rx) = mpsc::channel::<Vec<u8>>(100);

    let last_activity = Arc::new(StdMutex::new(SystemTime::now()));
    let heartbeat = Arc::new(StdMutex::new(SystemTime::now()));
    let connected = Arc::new(StdMutex::new(true));

    // Task dedicada para escrita
    let channel_write = Arc::clone(&channel);
    let stdin_task = tokio::task::spawn_blocking(move || {
        println!("ponto: 28 - Iniciando task de escrita");
        while let Some(data) = stdin_rx.blocking_recv() {
            println!(
                "ponto: 29 - Recebido dado para escrita: {} bytes",
                data.len()
            );

            let mut retry_count = 0;
            let max_retries = 3;
            let mut success = false;

            while retry_count < max_retries && !success {
                let mut channel_guard = match channel_write.lock() {
                    Ok(guard) => guard,
                    Err(e) => {
                        println!("ponto: 29.1 - Erro ao obter lock do canal: {}", e);
                        break;
                    }
                };

                // Tentar escrever os dados
                match channel_guard.write_all(&data) {
                    Ok(_) => {
                        if let Ok(_) = channel_guard.flush() {
                            println!("ponto: 30.1 - Dados escritos e flush realizado");
                            success = true;
                        } else {
                            println!("ponto: 30.2 - Erro no flush, tentando novamente");
                            thread::sleep(Duration::from_millis(100));
                            retry_count += 1;
                            continue;
                        }
                    }
                    Err(e) => {
                        println!(
                            "ponto: 30.3 - Erro na escrita: {}. Tentativa {}",
                            e,
                            retry_count + 1
                        );
                        thread::sleep(Duration::from_millis(100));
                        retry_count += 1;
                        continue;
                    }
                }

                drop(channel_guard);
                thread::sleep(Duration::from_millis(50));
            }

            if success {
                println!(
                    "ponto: 32 - Escrita concluída com sucesso após {} tentativas",
                    retry_count + 1
                );
            } else {
                println!(
                    "ponto: 32.1 - Falha na escrita após {} tentativas",
                    max_retries
                );
            }
        }
        println!("ponto: 33 - Task de escrita finalizada");
    });

    // Task dedicada para leitura
    let channel_read = Arc::clone(&channel);
    let app_handle_clone = app_handle.clone();
    let id_clone = id.clone();
    let stdout_task = tokio::task::spawn_blocking(move || {
        println!("ponto: 21 - Iniciando task de leitura");
        let mut buf = vec![0; 16384];

        loop {
            let mut channel_guard = match channel_read.lock() {
                Ok(guard) => guard,
                Err(e) => {
                    println!("ponto: 21.1 - Erro ao obter lock do canal: {}", e);
                    thread::sleep(Duration::from_millis(100));
                    continue;
                }
            };

            match channel_guard.read(&mut buf) {
                Ok(n) => {
                    if n > 0 {
                        println!("ponto: 23 - Dados recebidos ({} bytes)", n);

                        let _ = app_handle_clone.emit(
                            SSH_STDOUT_EVENT,
                            SshStdoutPayload {
                                id: id_clone.clone(),
                                bytes: buf[..n].to_vec(),
                            },
                        );
                    } else {
                        drop(channel_guard);
                        thread::sleep(Duration::from_millis(10));
                        continue;
                    }
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    drop(channel_guard);
                    thread::sleep(Duration::from_millis(10));
                    continue;
                }
                Err(e) => {
                    println!("ponto: 26 - Erro na leitura: {}", e);
                    break;
                }
            }

            drop(channel_guard);
        }
        println!("ponto: 27 - Task de leitura finalizada");
    });

    let session = SshSession {
        id: id.clone(),
        window_id: window_id.clone(),
        channel: Arc::clone(&channel),
        stdin_tx,
        stdin_task,
        stdout_task,
        last_activity,
        heartbeat,
        connected,
    };

    // Armazenar sessão
    let mut ssh_sessions = state.ssh_sessions.lock().await;
    ssh_sessions.insert(id.clone(), session);

    // Ok(id)

    // let mut ssh_sessions = state.ssh_sessions.lock().await;
    // ssh_sessions.insert(
    //     id.clone(),
    //     SshSession {
    //         id: id.clone(),
    //         stdin_tx,
    //         stdin_task,
    //         stdout_task,
    //     },
    // );

    app_handle
        .emit(
            SSH_SPAWN_EVENT,
            SshSpawnPayload {
                id: id.clone(),
                host,
                port,
                username,
                password: None,
            },
        )
        .map_err(|e| e.to_string())?;

    println!("ponto: 36 - spawn_ssh concluído com sucesso");
    Ok(id)
}

#[tauri::command]
pub async fn write_ssh(
    state: State<'_, JexpeState>,
    id: String,
    data: String,
) -> Result<usize, String> {
    let (stdin_tx, connected, last_activity) = {
        let ssh_sessions = state.ssh_sessions.lock().await;
        let session = ssh_sessions
            .get(&id)
            .ok_or_else(|| "SSH session not found".to_string())?;
        (
            session.stdin_tx.clone(),
            Arc::clone(&session.connected),
            Arc::clone(&session.last_activity),
        )
    };

    // Verificar se a sessão está conectada
    if let Ok(connected) = connected.lock() {
        if !*connected {
            return Err("Sessão desconectada".to_string());
        }
    }

    // Atualizar timestamp de última atividade
    if let Ok(mut last_activity) = last_activity.lock() {
        *last_activity = SystemTime::now();
    }

    // let data_with_newline = format!("{}\r\n", data); isso aqui tava duplucando a saida
    let data_with_newline = format!("{}\n", data);
    let bytes = data_with_newline.into_bytes();
    let len = bytes.len();

    stdin_tx
        .send(bytes)
        .await
        .map_err(|e| format!("Failed to send data: {}", e))?;

    Ok(len)
}

#[tauri::command]
pub async fn resize_ssh(state: State<'_, JexpeState>, id: String, size: PtySize) -> Result<(), String> {
    let channel = {
        let ssh_sessions = state.ssh_sessions.lock().await;
        let session = ssh_sessions
            .get(&id)
            .ok_or_else(|| "SSH session not found".to_string())?;
        Arc::clone(&session.channel)
    };

    tokio::task::spawn_blocking(move || {
        let mut channel_guard = channel
            .lock()
            .map_err(|_| "Failed to lock SSH channel".to_string())?;

        let width_px = if size.pixel_width > 0 {
            Some(size.pixel_width as u32)
        } else {
            None
        };
        let height_px = if size.pixel_height > 0 {
            Some(size.pixel_height as u32)
        } else {
            None
        };

        channel_guard
            .request_pty_size(size.cols as u32, size.rows as u32, width_px, height_px)
            .map_err(|e| e.to_string())?;

        Ok::<(), String>(())
    })
    .await
    .map_err(|e| e.to_string())??;

    Ok(())
}

#[tauri::command]
pub async fn kill_ssh(state: State<'_, JexpeState>, id: String) -> Result<(), String> {
    println!("ponto: 43 - Iniciando kill_ssh para ID: {}", id);

    let mut ssh_sessions = state.ssh_sessions.lock().await;
    if let Some(session) = ssh_sessions.remove(&id) {
        println!("ponto: 44 - Sessão encontrada, encerrando tasks");
        session.stdin_task.abort();
        session.stdout_task.abort();
    }

    println!("ponto: 45 - Sessão encerrada");
    Ok(())
}

#[tauri::command]
pub async fn cleanup_inactive_sessions(state: State<'_, JexpeState>) -> Result<(), String> {
    let mut ssh_sessions = state.ssh_sessions.lock().await;
    let now = SystemTime::now();

    let inactive_sessions: Vec<String> = ssh_sessions
        .iter()
        .filter_map(|(id, session)| {
            let inactive = {
                let last_activity = session.last_activity.lock().ok()?;
                now.duration_since(*last_activity).ok()? > INACTIVE_TIMEOUT
            };

            let disconnected = {
                let last_heartbeat = session.heartbeat.lock().ok()?;
                now.duration_since(*last_heartbeat).ok()? > HEARTBEAT_TIMEOUT
            };

            if inactive || disconnected {
                Some(id.clone())
            } else {
                None
            }
        })
        .collect();

    for id in inactive_sessions {
        if let Some(session) = ssh_sessions.remove(&id) {
            println!(
                "ponto: 50 - Encerrando sessão: {} (inativa ou desconectada)",
                id
            );
            session.stdin_task.abort();
            session.stdout_task.abort();
        }
    }

    Ok(())
}
#[tauri::command]
pub async fn heartbeat(
    state: State<'_, JexpeState>,
    id: String,
    window_id: String,
) -> Result<(), String> {
    let ssh_sessions = state.ssh_sessions.lock().await;
    if let Some(session) = ssh_sessions.get(&id) {
        if let Ok(mut last_heartbeat) = session.heartbeat.lock() {
            *last_heartbeat = SystemTime::now();
        }
        if let Ok(mut connected) = session.connected.lock() {
            *connected = true;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn shutdown_all_sessions(state: State<'_, JexpeState>) -> Result<(), String> {
    let mut ssh_sessions = state.ssh_sessions.lock().await;
    for (id, session) in ssh_sessions.drain() {
        println!("ponto: 60 - Encerrando sessão: {} (shutdown)", id);
        session.stdin_task.abort();
        session.stdout_task.abort();
    }
    Ok(())
}
#[tauri::command]
pub async fn reconnect_session(
    state: State<'_, JexpeState>,
    window_id: String,
) -> Result<String, String> {
    let ssh_sessions = state.ssh_sessions.lock().await;

    // Procurar sessão existente para esta janela
    for (id, session) in ssh_sessions.iter() {
        if session.window_id == window_id {
            if let Ok(mut connected) = session.connected.lock() {
                *connected = true;
            }
            if let Ok(mut last_heartbeat) = session.heartbeat.lock() {
                *last_heartbeat = SystemTime::now();
            }
            return Ok(id.clone());
        }
    }

    Err("Nenhuma sessão encontrada para esta janela".to_string())
}
