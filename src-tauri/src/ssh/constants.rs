use std::time::Duration;

pub const SSH_SPAWN_EVENT: &str = "EVENTS:SSH:SPAWN";
pub const SSH_STDOUT_EVENT: &str = "EVENTS:SSH:STDOUT";
pub const SSH_EXIT_EVENT: &str = "EVENTS:SSH:EXIT";
pub const INACTIVE_TIMEOUT: Duration = Duration::from_secs(300); // 5 minutos
pub const HEARTBEAT_TIMEOUT: Duration = Duration::from_secs(30); // 30 segundos
pub const MAX_PIPE_CHUNK_SIZE: usize = 16384;
