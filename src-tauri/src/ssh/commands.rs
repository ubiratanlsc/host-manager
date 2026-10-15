use super::io_buffer::WriteBuffer;
use super::*;
use crate::AppState;
use cuid2;
use portable_pty::PtySize;
use socket2::{SockRef, TcpKeepalive};
use ssh2::{
    BlockDirections, CheckResult, ErrorCode, HashType, HostKeyType, KeyboardInteractivePrompt,
    KnownHostFileKind, MethodType,
};
use std::fs;
use std::io::{Read, Write};
use std::path::Path;
use std::thread;
use std::time::Duration;
use tauri::Emitter;

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

fn get_home_dir() -> Option<String> {
    #[cfg(target_os = "windows")]
    let home = std::env::var("USERPROFILE").ok()?;
    #[cfg(not(target_os = "windows"))]
    let home = std::env::var("HOME").ok()?;
    Some(home)
}

fn get_known_hosts_path() -> Option<std::path::PathBuf> {
    let home = get_home_dir()?;
    let ssh_dir = Path::new(&home).join(".ssh");
    let _ = std::fs::create_dir_all(&ssh_dir);
    Some(ssh_dir.join("known_hosts"))
}

fn base64_encode_sha256(hash: &[u8]) -> String {
    use base64::Engine;
    base64::engine::general_purpose::STANDARD
        .encode(hash)
        .trim_end_matches('=')
        .to_string()
}

fn hex_encode_md5(hash: &[u8]) -> String {
    hash.iter()
        .map(|b| format!("{:02x}", b))
        .collect::<Vec<_>>()
        .join(":")
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum KnownHostStatus {
    Trusted,
    Unknown,
    Changed,
}

impl KnownHostStatus {
    fn as_str(self) -> &'static str {
        match self {
            Self::Trusted => "trusted",
            Self::Unknown => "unknown",
            Self::Changed => "changed",
        }
    }
}

fn classify_known_host(result: CheckResult) -> Result<KnownHostStatus, String> {
    match result {
        CheckResult::Match => Ok(KnownHostStatus::Trusted),
        CheckResult::NotFound => Ok(KnownHostStatus::Unknown),
        CheckResult::Mismatch => Ok(KnownHostStatus::Changed),
        CheckResult::Failure => {
            Err("Não foi possível verificar a identidade do servidor no known_hosts".to_string())
        }
    }
}

fn known_host_storage_name(host: &str, port: u16) -> String {
    if port == 22 {
        host.to_string()
    } else {
        format!("[{}]:{}", host, port)
    }
}

fn known_host_names_to_replace(host: &str, port: u16) -> Vec<String> {
    if port == 22 {
        vec![host.to_string(), format!("[{}]:22", host)]
    } else {
        vec![known_host_storage_name(host, port)]
    }
}

fn hashed_host_matches(pattern: &str, candidates: &[String]) -> bool {
    use base64::Engine;
    use ring::hmac;

    let parts = pattern.split('|').collect::<Vec<_>>();
    if parts.len() != 4 || !parts[0].is_empty() || parts[1] != "1" {
        return false;
    }

    let Ok(salt) = base64::engine::general_purpose::STANDARD.decode(parts[2]) else {
        return false;
    };
    let Ok(expected_hash) = base64::engine::general_purpose::STANDARD.decode(parts[3]) else {
        return false;
    };
    let key = hmac::Key::new(hmac::HMAC_SHA1_FOR_LEGACY_USE_ONLY, &salt);

    candidates
        .iter()
        .any(|candidate| hmac::verify(&key, candidate.as_bytes(), &expected_hash).is_ok())
}

fn host_pattern_matches(pattern: &str, candidates: &[String]) -> bool {
    if pattern.starts_with('!') {
        return false;
    }

    candidates.iter().any(|candidate| pattern == candidate)
        || hashed_host_matches(pattern, candidates)
}

#[derive(Debug, Eq, PartialEq)]
struct KnownHostsRemoval {
    contents: String,
    removed: usize,
}

fn first_token_bounds(value: &str) -> Option<(usize, usize)> {
    let start = value
        .char_indices()
        .find_map(|(index, character)| (!character.is_whitespace()).then_some(index))?;
    let end = value[start..]
        .char_indices()
        .find_map(|(index, character)| character.is_whitespace().then_some(start + index))
        .unwrap_or(value.len());
    Some((start, end))
}

fn remove_known_host_entries(contents: &str, host: &str, port: u16) -> KnownHostsRemoval {
    let candidates = known_host_names_to_replace(host, port);
    let mut updated = String::with_capacity(contents.len());
    let mut removed = 0;

    for line in contents.split_inclusive('\n') {
        let (body, line_ending) = if let Some(body) = line.strip_suffix("\r\n") {
            (body, "\r\n")
        } else if let Some(body) = line.strip_suffix('\n') {
            (body, "\n")
        } else {
            (line, "")
        };

        let Some((host_start, host_end)) = first_token_bounds(body) else {
            updated.push_str(line);
            continue;
        };
        let host_field = &body[host_start..host_end];

        // Marcadores como @revoked e @cert-authority são políticas de segurança,
        // não chaves comuns do host. Nunca os removemos automaticamente.
        if host_field.starts_with('@') || host_field.starts_with('#') {
            updated.push_str(line);
            continue;
        }

        let aliases = host_field.split(',').collect::<Vec<_>>();
        let retained = aliases
            .iter()
            .copied()
            .filter(|alias| !host_pattern_matches(alias, &candidates))
            .collect::<Vec<_>>();
        let removed_from_line = aliases.len() - retained.len();

        if removed_from_line == 0 {
            updated.push_str(line);
            continue;
        }

        removed += removed_from_line;
        if !retained.is_empty() {
            updated.push_str(&body[..host_start]);
            updated.push_str(&retained.join(","));
            updated.push_str(&body[host_end..]);
            updated.push_str(line_ending);
        }
    }

    KnownHostsRemoval {
        contents: updated,
        removed,
    }
}

/// Tipos de chave (ex.: "ssh-ed25519") já confiados para o host no
/// known_hosts. Entradas exatas de host:porta vêm antes do fallback pelo host.
fn known_host_key_types(contents: &str, host: &str, port: u16) -> Vec<String> {
    let exact = known_host_names_to_replace(host, port);
    let fallback = if port == 22 { Vec::new() } else { vec![host.to_string()] };
    let mut types: Vec<String> = Vec::new();

    for candidates in [&exact, &fallback] {
        if candidates.is_empty() {
            continue;
        }
        for line in contents.lines() {
            let mut fields = line.split_whitespace();
            let (Some(hosts), Some(key_type)) = (fields.next(), fields.next()) else {
                continue;
            };
            // Comentários e marcadores (@cert-authority, @revoked) não são
            // chaves do host.
            if hosts.starts_with('#') || hosts.starts_with('@') {
                continue;
            }
            let matches = hosts
                .split(',')
                .any(|pattern| host_pattern_matches(pattern, candidates));
            if matches && !types.iter().any(|known| known == key_type) {
                types.push(key_type.to_string());
            }
        }
    }
    types
}

/// Algoritmos de host key que validam uma chave do tipo salvo no known_hosts.
fn host_key_algorithms_for(key_type: &str) -> &'static [&'static str] {
    match key_type {
        "ssh-ed25519" => &["ssh-ed25519"],
        "ecdsa-sha2-nistp256" => &["ecdsa-sha2-nistp256"],
        "ecdsa-sha2-nistp384" => &["ecdsa-sha2-nistp384"],
        "ecdsa-sha2-nistp521" => &["ecdsa-sha2-nistp521"],
        "ssh-rsa" => &["rsa-sha2-512", "rsa-sha2-256", "ssh-rsa"],
        "ssh-dss" => &["ssh-dss"],
        _ => &[],
    }
}

/// Igual ao OpenSSH: pede primeiro ao servidor o tipo de chave já confiado,
/// para não acusar "chave mudou" só porque ele também tem outra chave (ex.:
/// salvo RSA, servidor prefere Ed25519). Os demais suportados vêm depois.
/// `None` quando não há nada salvo (mantém a ordem padrão do libssh2).
fn preferred_host_key_algorithms(known_types: &[String], supported: &[&str]) -> Option<String> {
    let mut prefs: Vec<&str> = Vec::new();
    for key_type in known_types {
        for algorithm in host_key_algorithms_for(key_type) {
            if supported.contains(algorithm) && !prefs.contains(algorithm) {
                prefs.push(algorithm);
            }
        }
    }
    if prefs.is_empty() {
        return None;
    }
    for algorithm in supported {
        if !prefs.contains(algorithm) {
            prefs.push(algorithm);
        }
    }
    Some(prefs.join(","))
}

fn openssh_key_type(host_key_type: HostKeyType) -> Result<&'static str, String> {
    match host_key_type {
        HostKeyType::Rsa => Ok("ssh-rsa"),
        HostKeyType::Dss => Ok("ssh-dss"),
        HostKeyType::Ecdsa256 => Ok("ecdsa-sha2-nistp256"),
        HostKeyType::Ecdsa384 => Ok("ecdsa-sha2-nistp384"),
        HostKeyType::Ecdsa521 => Ok("ecdsa-sha2-nistp521"),
        HostKeyType::Ed25519 => Ok("ssh-ed25519"),
        HostKeyType::Unknown => {
            Err("O servidor apresentou um tipo de chave desconhecido".to_string())
        }
    }
}

fn persist_known_host(
    sess: &Session,
    path: &Path,
    host: &str,
    port: u16,
    host_key: &[u8],
    host_key_type: HostKeyType,
    status: KnownHostStatus,
) -> Result<(), String> {
    use base64::Engine;

    let (original, existed) = match fs::read_to_string(path) {
        Ok(contents) => (contents, true),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => (String::new(), false),
        Err(error) => {
            return Err(format!(
                "Não foi possível ler {}: {}",
                path.display(),
                error
            ))
        }
    };

    let mut updated = if status == KnownHostStatus::Changed {
        let removal = remove_known_host_entries(&original, host, port);
        if removal.removed == 0 && port == 22 {
            return Err(format!(
                "A chave antiga de {}:{} não foi localizada em {}. Remova-a manualmente e tente novamente.",
                host,
                port,
                path.display()
            ));
        }
        if removal.removed == 0 {
            // O libssh2 usa a entrada genérica do host como fallback para uma
            // porta não padrão. Mantemos essa chave (ela pode pertencer à
            // porta 22) e criamos uma entrada específica para host:porta.
            original.clone()
        } else {
            removal.contents
        }
    } else {
        original.clone()
    };

    if !updated.is_empty() && !updated.ends_with('\n') {
        updated.push('\n');
    }
    let encoded_key = base64::engine::general_purpose::STANDARD.encode(host_key);
    updated.push_str(&format!(
        "{} {} {} host-manager\n",
        known_host_storage_name(host, port),
        openssh_key_type(host_key_type)?,
        encoded_key
    ));

    if status == KnownHostStatus::Changed && existed {
        let backup_path = path.with_extension("host-manager.bak");
        fs::copy(path, &backup_path).map_err(|error| {
            format!(
                "Não foi possível criar o backup {}: {}",
                backup_path.display(),
                error
            )
        })?;
    }

    fs::write(path, updated)
        .map_err(|error| format!("Não foi possível atualizar {}: {}", path.display(), error))?;

    let verification = (|| {
        let mut known = sess.known_hosts().map_err(|error| error.to_string())?;
        known
            .read_file(path, KnownHostFileKind::OpenSSH)
            .map_err(|error| error.to_string())?;
        match classify_known_host(known.check_port(host, port, host_key))? {
            KnownHostStatus::Trusted => Ok(()),
            _ => Err("A chave salva não passou pela verificação final".to_string()),
        }
    })();

    if let Err(error) = verification {
        if existed {
            let _ = fs::write(path, original);
        } else {
            let _ = fs::remove_file(path);
        }
        return Err(format!(
            "Não foi possível confirmar a atualização do known_hosts: {}",
            error
        ));
    }

    Ok(())
}

fn known_host_recovery_command(host: &str, port: u16, path: &Path) -> String {
    format!(
        "ssh-keygen -R \"{}\" -f \"{}\"",
        known_host_storage_name(host, port),
        path.display()
    )
}

fn is_algorithm_negotiation_error(code: i32) -> bool {
    // Constantes estáveis do libssh2: KEX_FAILURE, KEY_EXCHANGE_FAILURE e
    // ALGO_UNSUPPORTED. A crate ssh2 não as reexporta publicamente.
    matches!(code, -5 | -8 | -51)
}

/// Código LIBSSH2_ERROR_TIMEOUT.
const LIBSSH2_ERROR_TIMEOUT: i32 = -9;

fn is_timeout(error: &ssh2::Error) -> bool {
    error.code() == ErrorCode::Session(LIBSSH2_ERROR_TIMEOUT)
}

fn auth_error(error: &ssh2::Error) -> String {
    if is_timeout(error) {
        return format!(
            "Falha na autenticação: o servidor não concluiu o login em {}s. Verifique usuário e senha ou se ele exige outro método de login.",
            SSH_OPERATION_TIMEOUT_MS / 1000
        );
    }
    format!("Falha na autenticação: {}", error)
}

fn session_error(step: &str, error: &ssh2::Error) -> String {
    if is_timeout(error) {
        return format!("O servidor não respondeu ao {} em {}s.", step, SSH_OPERATION_TIMEOUT_MS / 1000);
    }
    format!("Falha ao {}: {}", step, error)
}

fn authenticate(
    sess: &mut Session,
    username: &str,
    password: &Option<String>,
    identity_file: &Option<String>,
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
            .map_err(|e| auth_error(&e))?;
    } else {
        println!("ponto: 5 - Tentando autenticação por chave");

        if let Some(key_path) = identity_file {
            let key_path = Path::new(key_path);
            if key_path.exists() {
                println!(
                    "ponto: 5.1 - Tentando chave personalizada: {}",
                    key_path.display()
                );
                let pub_key = key_path.with_extension("pub");
                match sess.userauth_pubkey_file(
                    username,
                    if pub_key.exists() {
                        Some(&pub_key)
                    } else {
                        None
                    },
                    key_path,
                    None,
                ) {
                    Ok(_) => {
                        println!("ponto: 5.2 - Chave personalizada bem-sucedida");
                        return Ok(());
                    }
                    Err(e) => {
                        println!("ponto: 5.3 - Chave personalizada falhou: {}", e);
                        return Err(auth_error(&e));
                    }
                }
            } else {
                println!(
                    "ponto: 5.4 - Chave personalizada não encontrada: {}",
                    key_path.display()
                );
                return Err(format!(
                    "Falha na autenticação: a chave {} não foi encontrada",
                    key_path.display()
                ));
            }
        }

        let home = get_home_dir().ok_or("HOME/USERPROFILE not set")?;
        let ssh_dir = Path::new(&home).join(".ssh");

        let key_types = ["id_ed25519", "id_ecdsa", "id_rsa", "id_dsa"];

        let result = sess.userauth_agent(username);
        if result.is_ok() {
            println!("ponto: 6 - Autenticação via agent bem-sucedida");
            return Ok(());
        }

        println!("ponto: 7 - Tentando caminhos padrão de chaves SSH");
        let mut last_err = None;
        for key_name in &key_types {
            let private_key = ssh_dir.join(key_name);
            let public_key = private_key.with_extension("pub");

            if !private_key.exists() {
                continue;
            }

            println!("ponto: 7.1 - Tentando chave: {}", key_name);
            match sess.userauth_pubkey_file(username, Some(&public_key), &private_key, None) {
                Ok(_) => {
                    println!("ponto: 7.2 - Autenticação com {} bem-sucedida", key_name);
                    return Ok(());
                }
                Err(e) => {
                    println!("ponto: 7.3 - {} falhou: {}", key_name, e);
                    last_err = Some(e);
                }
            }
        }

        // Sem senha cadastrada e nenhuma chave aceita: o frontend usa este
        // prefixo para pedir a senha do host.
        return Err(format!(
            "Falha na autenticação: nenhuma senha cadastrada e nenhuma chave SSH foi aceita ({})",
            last_err
                .map(|e| e.to_string())
                .unwrap_or_else(|| "nenhuma chave encontrada em ~/.ssh".to_string())
        ));
    }
    println!("ponto: 7 - Autenticação bem-sucedida");
    Ok(())
}

#[tauri::command]
#[allow(clippy::too_many_arguments)] // Tauri exposes these fields as the invoke payload.
pub async fn spawn_ssh(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    window_id: String,
    host: String,
    port: u16,
    username: String,
    password: Option<String>,
    identity_file: Option<String>,
) -> Result<String, String> {
    println!("ponto: 8 - Iniciando spawn_ssh para window: {}", window_id);

    // Senha vazia vale como "sem senha": tenta ssh-agent e chaves em vez de
    // um login por senha em branco (que sempre falha).
    let password = password.filter(|p| !p.is_empty());

    // Verificar se já existe uma sessão para esta janela
    {
        let ssh_sessions = state.ssh_sessions.lock().await;
        for session in ssh_sessions.values() {
            if session.window_id == window_id {
                return Err("Já existe uma sessão SSH para esta janela".to_string());
            }
        }
    }

    let id = cuid2::create_id();

    // connect_timeout evita travar a UI por 20s+ quando o host está
    // inacessível (o connect padrão usa o timeout do SO).
    let tcp = {
        use std::net::ToSocketAddrs;
        let addrs = (host.as_str(), port)
            .to_socket_addrs()
            .map_err(|e| format!("Failed to resolve {}: {}", host, e))?;
        let mut last_err: Option<std::io::Error> = None;
        let mut stream = None;
        for addr in addrs {
            match TcpStream::connect_timeout(&addr, Duration::from_secs(10)) {
                Ok(s) => {
                    stream = Some(s);
                    break;
                }
                Err(e) => last_err = Some(e),
            }
        }
        stream.ok_or_else(|| {
            last_err
                .map(|e| e.to_string())
                .unwrap_or_else(|| format!("Could not resolve host: {}", host))
        })?
    };

    // TCP keepalive em nível de SO: detecta peer morto (servidor caiu, rede
    // sumiu) sem depender de tráfego da aplicação. Quando as sondas falham, o
    // socket entra em erro e o loop de leitura encerra emitindo SSH_EXIT.
    {
        let keepalive = TcpKeepalive::new()
            .with_time(Duration::from_secs(20))
            .with_interval(Duration::from_secs(10));
        let _ = SockRef::from(&tcp).set_tcp_keepalive(&keepalive);
    }

    let mut sess = Session::new().map_err(|e| e.to_string())?;

    // Limite para cada operação bloqueante (handshake, autenticação, abertura
    // do canal). Sem isto um servidor que não responde — ex.: um prompt
    // keyboard-interactive que nunca termina — deixa o spawn pendurado para
    // sempre e o frontend sem retorno. Depois do shell o modo é não-bloqueante
    // e o timeout deixa de se aplicar.
    sess.set_timeout(SSH_OPERATION_TIMEOUT_MS);

    // Precisa ser antes do handshake.
    if let Some(contents) = get_known_hosts_path().and_then(|path| fs::read_to_string(path).ok()) {
        let known_types = known_host_key_types(&contents, &host, port);
        if let Ok(supported) = sess.supported_algs(MethodType::HostKey) {
            if let Some(prefs) = preferred_host_key_algorithms(&known_types, &supported) {
                println!("ponto: 8.1 - Preferindo host keys já conhecidas: {}", prefs);
                if let Err(error) = sess.method_pref(MethodType::HostKey, &prefs) {
                    println!("ponto: 8.2 - Não foi possível definir a preferência: {}", error);
                }
            }
        }
    }

    sess.set_tcp_stream(tcp);
    if let Err(error) = sess.handshake() {
        let detail = error.to_string();
        let code = match error.code() {
            ErrorCode::Session(code) | ErrorCode::SFTP(code) => code,
        };

        if is_algorithm_negotiation_error(code) {
            let _ = app_handle.emit(
                "ssh-connection-error",
                serde_json::json!({
                    "kind": "algorithm_negotiation",
                    "host": host,
                    "port": port,
                    "details": detail,
                }),
            );
            return Err(format!(
                "Não foi possível negociar os algoritmos SSH com {}:{}. Consulte o aviso exibido para revisar a configuração do servidor.",
                host, port
            ));
        }

        return Err(format!(
            "Falha ao iniciar a conexão SSH com {}:{}. Detalhes: {}",
            host, port, detail
        ));
    }

    // Verificação de host key
    let (hostkey, hostkey_type) = sess.host_key().ok_or("Failed to get host key")?;
    let hostkey_type_str = format!("{:?}", hostkey_type);
    let hash_sha256 = sess
        .host_key_hash(HashType::Sha256)
        .ok_or("Failed to get SHA256 hash")?;
    let fingerprint_sha256 = base64_encode_sha256(hash_sha256);
    let fingerprint_md5 = sess.host_key_hash(HashType::Md5).map(hex_encode_md5);

    let known_hosts_path = get_known_hosts_path().ok_or_else(|| {
        "Não foi possível localizar a pasta do usuário para verificar o known_hosts".to_string()
    })?;
    let host_key_status = {
        let mut known = sess.known_hosts().map_err(|e| e.to_string())?;
        if known_hosts_path.exists() {
            known
                .read_file(&known_hosts_path, KnownHostFileKind::OpenSSH)
                .map_err(|error| {
                    format!(
                        "Não foi possível ler {}: {}",
                        known_hosts_path.display(),
                        error
                    )
                })?;
        }
        classify_known_host(known.check_port(&host, port, hostkey))?
    };

    if host_key_status == KnownHostStatus::Trusted {
        println!("ponto: 8.5 - Host key conhecido");
    } else {
        println!(
            "ponto: 8.6 - Host key {}, solicitando confirmação",
            host_key_status.as_str()
        );
        let prompt_id = cuid2::create_id();
        let (tx, rx) = tokio::sync::oneshot::channel::<bool>();
        {
            let mut pending = state.pending_hostkey.lock().await;
            pending.insert(prompt_id.clone(), tx);
        }
        if let Err(error) = app_handle.emit(
            "hostkey-prompt",
            serde_json::json!({
                "prompt_id": prompt_id.clone(),
                "host": host,
                "port": port,
                "status": host_key_status.as_str(),
                "fingerprint_sha256": fingerprint_sha256,
                "fingerprint_md5": fingerprint_md5,
                "key_type": hostkey_type_str,
                "known_hosts_path": known_hosts_path.display().to_string(),
                "recovery_command": known_host_recovery_command(&host, port, &known_hosts_path),
            }),
        ) {
            state.pending_hostkey.lock().await.remove(&prompt_id);
            return Err(format!(
                "Não foi possível exibir a confirmação da chave do servidor: {}",
                error
            ));
        }
        let accepted = rx
            .await
            .map_err(|_| "A confirmação da chave do servidor foi interrompida".to_string())?;
        if !accepted {
            return Err("Conexão cancelada: a chave do servidor não foi aceita".to_string());
        }
        println!("ponto: 8.7 - Host key aceito pelo usuário");
        persist_known_host(
            &sess,
            &known_hosts_path,
            &host,
            port,
            hostkey,
            hostkey_type,
            host_key_status,
        )?;
    }

    authenticate(&mut sess, &username, &password, &identity_file)?;

    let mut channel = sess.channel_session().map_err(|e| session_error("abrir o canal", &e))?;

    // PTY interativo real: usamos os modos padrão do servidor (echo ligado,
    // line discipline, etc). Assim o shell remoto cuida do echo, edição de
    // linha, histórico (setas) E autocompletar com Tab nativamente. Cada tecla
    // é encaminhada crua pelo frontend (pass-through), igual ao terminal local.
    channel
        .request_pty("xterm-256color", None, None)
        .map_err(|e| e.to_string())?;

    channel.shell().map_err(|e| e.to_string())?;

    // Configurar modo não-bloqueante
    sess.set_blocking(false);

    let (cmd_tx, cmd_rx) = std_mpsc::channel::<SshCommand>();
    let connected = Arc::new(StdMutex::new(true));

    // Thread única de I/O: dona exclusiva do canal. Escrita, leitura, resize e
    // close acontecem aqui, em sequência — nunca em paralelo.
    let connected_io = Arc::clone(&connected);
    let app_handle_clone = app_handle.clone();
    let id_clone = id.clone();
    let io_task = tokio::task::spawn_blocking(move || {
        println!("ponto: 21 - Iniciando task de I/O");
        run_ssh_io_loop(sess, channel, cmd_rx, |bytes| {
            let _ = app_handle_clone.emit(
                SSH_STDOUT_EVENT,
                SshStdoutPayload {
                    id: id_clone.clone(),
                    bytes,
                },
            );
        });

        // Marca como desconectado e avisa o frontend (emitido uma única vez).
        if let Ok(mut c) = connected_io.lock() {
            *c = false;
        }
        let _ = app_handle_clone.emit(
            SSH_EXIT_EVENT,
            SshExitPayload {
                id: id_clone.clone(),
                success: true,
                code: None,
            },
        );
        println!("ponto: 27 - Task de I/O finalizada (SSH_EXIT emitido)");
    });

    let session = SshSession {
        id: id.clone(),
        window_id: window_id.clone(),
        host: host.clone(),
        port,
        username: username.clone(),
        cmd_tx,
        io_task,
        connected,
    };

    // Armazenar sessão
    let mut ssh_sessions = state.ssh_sessions.lock().await;
    ssh_sessions.insert(id.clone(), session);

    app_handle
        .emit(
            SSH_SPAWN_EVENT,
            SshSpawnPayload {
                id: id.clone(),
                host,
                port,
                username,
            },
        )
        .map_err(|e| e.to_string())?;

    println!("ponto: 36 - spawn_ssh concluído com sucesso");
    Ok(id)
}

/// Código LIBSSH2_ERROR_EAGAIN.
const LIBSSH2_ERROR_EAGAIN: i32 = -37;

fn is_eagain(error: &ssh2::Error) -> bool {
    error.code() == ErrorCode::Session(LIBSSH2_ERROR_EAGAIN)
}

/// Depois de um EAGAIN: se o libssh2 está esperando o socket aceitar a saída,
/// há um pacote parcialmente enviado e NENHUMA outra operação pode ser feita
/// antes de completá-lo (senão o pacote é corrompido e o servidor derruba a
/// conexão — era o "transport read").
fn outbound_blocked(sess: &Session) -> bool {
    matches!(
        sess.block_directions(),
        BlockDirections::Outbound | BlockDirections::Both
    )
}

fn run_ssh_io_loop(
    sess: Session,
    mut channel: ssh2::Channel,
    cmd_rx: std_mpsc::Receiver<SshCommand>,
    mut emit_stdout: impl FnMut(Vec<u8>),
) {
    let mut writes = WriteBuffer::new(8192);
    let mut pending_resize: Option<(u32, u32, Option<u32>, Option<u32>)> = None;
    let mut buf = vec![0; MAX_PIPE_CHUNK_SIZE];

    'io: loop {
        // 1) Drena comandos pendentes.
        let mut close_requested = false;
        loop {
            match cmd_rx.try_recv() {
                Ok(SshCommand::Data(data)) => writes.push(&data),
                Ok(SshCommand::Resize {
                    cols,
                    rows,
                    width_px,
                    height_px,
                }) => pending_resize = Some((cols, rows, width_px, height_px)),
                Ok(SshCommand::Close) | Err(std_mpsc::TryRecvError::Disconnected) => {
                    close_requested = true;
                    break;
                }
                Err(std_mpsc::TryRecvError::Empty) => break,
            }
        }
        if close_requested {
            close_channel(&mut channel);
            break 'io;
        }

        let mut progressed = false;
        let mut blocked_out = false;

        // 2) Escrita. Em EAGAIN o buffer em voo fica intacto para o retry.
        if let Some(chunk) = writes.next_chunk() {
            match channel.write(chunk) {
                Ok(0) => {}
                Ok(n) => {
                    writes.advance(n);
                    progressed = true;
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    blocked_out = outbound_blocked(&sess);
                }
                Err(e) => {
                    println!("ponto: 30.3 - Erro fatal na escrita: {}", e);
                    break 'io;
                }
            }
        }

        // 3) Resize, só entre escritas completas.
        if !blocked_out && !writes.is_mid_write() {
            if let Some((cols, rows, width_px, height_px)) = pending_resize {
                match channel.request_pty_size(cols, rows, width_px, height_px) {
                    Ok(()) => {
                        pending_resize = None;
                        progressed = true;
                    }
                    Err(ref e) if is_eagain(e) => blocked_out = outbound_blocked(&sess),
                    Err(e) => {
                        println!("ponto: 31 - Falha no resize do PTY: {}", e);
                        pending_resize = None;
                    }
                }
            }
        }

        // 4) Leitura (nunca com um pacote de saída pela metade).
        if !blocked_out {
            match channel.read(&mut buf) {
                Ok(0) => {
                    // 0 bytes pode ser EOF real (canal fechado / `exit` remoto)
                    // ou apenas ausência momentânea de dados.
                    if channel.eof() {
                        println!("ponto: 25 - Canal SSH em EOF (fechado pelo remoto)");
                        break 'io;
                    }
                }
                Ok(n) => {
                    emit_stdout(buf[..n].to_vec());
                    progressed = true;
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {}
                Err(e) => {
                    println!("ponto: 26 - Erro na leitura: {}", e);
                    break 'io;
                }
            }
        }

        if !progressed {
            // Com saída bloqueada o socket libera rápido; senão, espera ociosa.
            thread::sleep(Duration::from_millis(if blocked_out { 2 } else { 8 }));
        }
    }
}

/// EOF + close best-effort, repetindo EAGAIN por no máximo ~500ms.
fn close_channel(channel: &mut ssh2::Channel) {
    let deadline = std::time::Instant::now() + Duration::from_millis(500);
    let retry = |op: &mut dyn FnMut() -> Result<(), ssh2::Error>| loop {
        match op() {
            Err(ref e) if is_eagain(e) && std::time::Instant::now() < deadline => {
                thread::sleep(Duration::from_millis(5));
            }
            _ => break,
        }
    };
    retry(&mut || channel.send_eof());
    retry(&mut || channel.close());
}

fn session_command_sender(
    sessions: &std::collections::HashMap<String, SshSession>,
    id: &str,
) -> Result<(std_mpsc::Sender<SshCommand>, Arc<StdMutex<bool>>), String> {
    let session = sessions
        .get(id)
        .ok_or_else(|| "SSH session not found".to_string())?;
    Ok((session.cmd_tx.clone(), Arc::clone(&session.connected)))
}

#[tauri::command]
pub async fn write_ssh(
    state: State<'_, AppState>,
    id: String,
    data: String,
) -> Result<usize, String> {
    let (cmd_tx, connected) = session_command_sender(&*state.ssh_sessions.lock().await, &id)?;

    // Verificar se a sessão está conectada
    if let Ok(connected) = connected.lock() {
        if !*connected {
            return Err("Sessão desconectada".to_string());
        }
    }

    // Pass-through cru: enviamos exatamente os bytes que o usuário digitou
    // (incluindo \r, \t, \x7f, sequências de escape). O shell remoto interpreta.
    let bytes = data.into_bytes();
    let len = bytes.len();

    cmd_tx
        .send(SshCommand::Data(bytes))
        .map_err(|e| format!("Failed to send data: {}", e))?;

    Ok(len)
}

#[tauri::command]
pub async fn resize_ssh(
    state: State<'_, AppState>,
    id: String,
    size: PtySize,
) -> Result<(), String> {
    let (cmd_tx, _) = session_command_sender(&*state.ssh_sessions.lock().await, &id)?;

    let width_px = (size.pixel_width > 0).then_some(size.pixel_width as u32);
    let height_px = (size.pixel_height > 0).then_some(size.pixel_height as u32);

    cmd_tx
        .send(SshCommand::Resize {
            cols: size.cols as u32,
            rows: size.rows as u32,
            width_px,
            height_px,
        })
        .map_err(|e| format!("Failed to resize: {}", e))
}

#[tauri::command]
pub async fn kill_ssh(state: State<'_, AppState>, id: String) -> Result<(), String> {
    println!("ponto: 43 - Iniciando kill_ssh para ID: {}", id);

    let session = {
        let mut ssh_sessions = state.ssh_sessions.lock().await;
        ssh_sessions.remove(&id)
    };

    if let Some(session) = session {
        println!("ponto: 44 - Sessão encontrada, encerrando graciosamente");
        // A thread de I/O envia EOF/close ao servidor (para o sshd liberar a
        // sessão imediatamente) e encerra.
        let _ = tokio::task::spawn_blocking(move || session.shutdown()).await;
    }

    println!("ponto: 45 - Sessão encerrada");
    Ok(())
}

#[tauri::command]
pub async fn list_ssh_sessions(state: State<'_, AppState>) -> Result<Vec<SshSpawnPayload>, String> {
    let ssh_sessions = state.ssh_sessions.lock().await;
    let mut result = Vec::new();

    for session in ssh_sessions.values() {
        let is_connected = session.connected.lock().map(|c| *c).unwrap_or(false);
        if is_connected {
            result.push(SshSpawnPayload {
                id: session.id.clone(),
                host: session.host.clone(),
                port: session.port,
                username: session.username.clone(),
            });
        }
    }

    println!("[SSH] list_ssh_sessions: {} sessões ativas", result.len());
    Ok(result)
}

#[tauri::command]
pub async fn respond_hostkey(
    state: State<'_, AppState>,
    prompt_id: String,
    accept: bool,
) -> Result<(), String> {
    let mut pending = state.pending_hostkey.lock().await;
    if let Some(sender) = pending.remove(&prompt_id) {
        sender
            .send(accept)
            .map_err(|_| "Failed to send response".to_string())
    } else {
        Err("Prompt not found or already responded".to_string())
    }
}

#[tauri::command]
pub async fn shutdown_all_sessions(state: State<'_, AppState>) -> Result<(), String> {
    let sessions: Vec<SshSession> = {
        let mut ssh_sessions = state.ssh_sessions.lock().await;
        ssh_sessions.drain().map(|(_, s)| s).collect()
    };

    for session in sessions {
        println!("ponto: 60 - Encerrando sessão: {} (shutdown)", session.id);
        let _ = tokio::task::spawn_blocking(move || session.shutdown()).await;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn distinguishes_changed_and_unknown_host_keys() {
        assert_eq!(
            classify_known_host(CheckResult::Mismatch).unwrap(),
            KnownHostStatus::Changed
        );
        assert_eq!(
            classify_known_host(CheckResult::NotFound).unwrap(),
            KnownHostStatus::Unknown
        );
        assert_eq!(
            classify_known_host(CheckResult::Match).unwrap(),
            KnownHostStatus::Trusted
        );
        assert!(classify_known_host(CheckResult::Failure).is_err());
    }

    #[test]
    fn formats_sha256_fingerprint_like_openssh() {
        assert_eq!(
            base64_encode_sha256(&[0; 32]),
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
        );
    }

    #[test]
    fn uses_openssh_default_port_host_name() {
        assert_eq!(known_host_storage_name("192.168.7.5", 22), "192.168.7.5");
        assert_eq!(
            known_host_storage_name("192.168.7.5", 2222),
            "[192.168.7.5]:2222"
        );
    }

    #[test]
    fn removes_the_stale_default_port_key_without_touching_other_hosts() {
        let contents = concat!(
            "# production hosts\n",
            "192.168.7.5 ecdsa-sha2-nistp256 OLDKEY comment\n",
            "server.example ssh-ed25519 OTHERKEY\n",
        );

        let result = remove_known_host_entries(contents, "192.168.7.5", 22);

        assert_eq!(result.removed, 1);
        assert_eq!(
            result.contents,
            "# production hosts\nserver.example ssh-ed25519 OTHERKEY\n"
        );
    }

    #[test]
    fn preserves_other_aliases_from_a_shared_known_hosts_line() {
        let contents = "192.168.7.5,server.local ssh-ed25519 OLDKEY\r\n";

        let result = remove_known_host_entries(contents, "192.168.7.5", 22);

        assert_eq!(result.removed, 1);
        assert_eq!(result.contents, "server.local ssh-ed25519 OLDKEY\r\n");
    }

    #[test]
    fn removes_a_hashed_openssh_host_entry() {
        let contents = concat!(
            "|1|AAECAwQFBgcICQoLDA0ODxAREhM=|xLxQPIhT/0cSdK2FzF6Q8PHkiLo= ",
            "ssh-ed25519 OLDKEY\n",
        );

        let result = remove_known_host_entries(contents, "192.168.7.5", 22);

        assert_eq!(result.removed, 1);
        assert!(result.contents.is_empty());
    }

    #[test]
    fn a_non_default_port_does_not_delete_the_default_host_key() {
        let contents = concat!(
            "192.168.7.5 ssh-ed25519 DEFAULTKEY\n",
            "[192.168.7.5]:2222 ssh-ed25519 PORTKEY\n",
        );

        let result = remove_known_host_entries(contents, "192.168.7.5", 2222);

        assert_eq!(result.removed, 1);
        assert_eq!(result.contents, "192.168.7.5 ssh-ed25519 DEFAULTKEY\n");
    }

    #[test]
    fn finds_trusted_key_types_for_plain_hashed_and_port_entries() {
        let contents = concat!(
            "# comentário\n",
            "@cert-authority * ssh-ed25519 CAKEY\n",
            "192.168.7.5,web ssh-ed25519 KEY1\n",
            "192.168.7.5 ssh-rsa KEY2 host-manager\n",
            "|1|AAECAwQFBgcICQoLDA0ODxAREhM=|xLxQPIhT/0cSdK2FzF6Q8PHkiLo= ecdsa-sha2-nistp256 KEY3\n",
            "[10.0.0.1]:2222 ssh-rsa KEY4\n",
            "10.0.0.1 ssh-ed25519 KEY5\n",
        );

        assert_eq!(
            known_host_key_types(contents, "192.168.7.5", 22),
            vec!["ssh-ed25519", "ssh-rsa", "ecdsa-sha2-nistp256"]
        );
        // Porta não padrão: a entrada exata vem antes do fallback pelo host.
        assert_eq!(
            known_host_key_types(contents, "10.0.0.1", 2222),
            vec!["ssh-rsa", "ssh-ed25519"]
        );
        assert!(known_host_key_types(contents, "10.9.9.9", 22).is_empty());
    }

    #[test]
    fn crypto_backend_supports_ed25519_host_keys() {
        // O backend WinCNG (ssh2 sem vendored-openssl no Windows) não tem
        // Ed25519 e fazia todo servidor Ed25519 parecer "chave mudou".
        let supported = Session::new()
            .unwrap()
            .supported_algs(MethodType::HostKey)
            .unwrap();
        assert!(supported.contains(&"ssh-ed25519"), "{:?}", supported);
    }

    #[test]
    fn prefers_the_already_trusted_host_key_algorithm() {
        let supported = [
            "ssh-ed25519",
            "ecdsa-sha2-nistp256",
            "rsa-sha2-512",
            "rsa-sha2-256",
            "ssh-rsa",
        ];

        assert_eq!(
            preferred_host_key_algorithms(&["ssh-rsa".to_string()], &supported).unwrap(),
            "rsa-sha2-512,rsa-sha2-256,ssh-rsa,ssh-ed25519,ecdsa-sha2-nistp256"
        );
        assert_eq!(
            preferred_host_key_algorithms(&["ssh-ed25519".to_string()], &supported).unwrap(),
            "ssh-ed25519,ecdsa-sha2-nistp256,rsa-sha2-512,rsa-sha2-256,ssh-rsa"
        );
        // Nada salvo (ou tipo não suportado): mantém a ordem padrão.
        assert!(preferred_host_key_algorithms(&[], &supported).is_none());
        assert!(preferred_host_key_algorithms(&["ssh-dss".to_string()], &supported).is_none());
    }

    #[test]
    fn recognizes_libssh2_algorithm_negotiation_failures() {
        assert!(is_algorithm_negotiation_error(-5));
        assert!(is_algorithm_negotiation_error(-8));
        assert!(is_algorithm_negotiation_error(-51));
        assert!(!is_algorithm_negotiation_error(-18));
    }
}
