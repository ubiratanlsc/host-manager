use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{command, State};

use crate::models::{Group, Host, Tag};
use crate::storage::file_storage::{FileStorage, StorageError};

type StorageState = Mutex<FileStorage>;

#[derive(serde::Serialize)]
pub struct CommandResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T> CommandResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn error(message: impl Into<String>) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(message.into()),
        }
    }
}

// Inicialização do sistema de armazenamento
pub fn init_storage() -> Result<FileStorage, StorageError> {
    let app_data_dir = tauri::api::path::app_data_dir(&tauri::Config::default())
        .expect("Falha ao obter diretório de dados da aplicação");

    let data_dir = app_data_dir.join("host-manager");
    FileStorage::new(data_dir)
}

// Comandos para Hosts
#[command]
pub fn create_host(
    storage: State<'_, StorageState>,
    name: String,
    ip: String,
    password: String,
) -> CommandResponse<String> {
    let host = Host::new(name, ip, password);
    let host_id = host.id.clone();

    let mut storage = storage.lock().unwrap();
    match storage.add_host(host) {
        Ok(_) => CommandResponse::success(host_id),
        Err(e) => CommandResponse::error(e.to_string()),
    }
}

#[command]
pub fn update_host(
    storage: State<'_, StorageState>,
    id: String,
    name: String,
    ip: String,
    password: String,
) -> CommandResponse<()> {
    let mut storage = storage.lock().unwrap();

    let mut host = match storage.get_host(&id) {
        Some(h) => h.clone(),
        None => return CommandResponse::error(format!("Host não encontrado: {}", id)),
    };

    host.name = name;
    host.ip = ip;
    host.password = password;

    match storage.update_host(host) {
        Ok(_) => CommandResponse::success(()),
        Err(e) => CommandResponse::error(e.to_string()),
    }
}

#[command]
pub fn delete_host(storage: State<'_, StorageState>, id: String) -> CommandResponse<()> {
    let mut storage = storage.lock().unwrap();

    match storage.delete_host(&id) {
        Ok(_) => CommandResponse::success(()),
        Err(e) => CommandResponse::error(e.to_string()),
    }
}

#[command]
pub fn get_host(storage: State<'_, StorageState>, id: String) -> CommandResponse<Host> {
    let storage = storage.lock().unwrap();

    match storage.get_host(&id) {
        Some(host) => CommandResponse::success(host.clone()),
        None => CommandResponse::error(format!("Host não encontrado: {}", id)),
    }
}

#[command]
pub fn list_hosts(storage: State<'_, StorageState>) -> CommandResponse<Vec<Host>> {
    let storage = storage.lock().unwrap();
    let hosts = storage.list_hosts().into_iter().cloned().collect();
    CommandResponse::success(hosts)
}

// Comandos para Grupos
#[command]
pub fn create_group(
    storage: State<'_, StorageState>,
    name: String,
    parent_id: Option<String>,
) -> CommandResponse<String> {
    let mut group = Group::new(name);
    let group_id = group.id.clone();

    if let Some(parent_id) = parent_id {
        group.set_parent(Some(parent_id.clone()));

        let mut storage = storage.lock().unwrap();

        // Verificar se o grupo pai existe
        if let Some(parent) = storage.get_group_mut(&parent_id) {
            parent.add_subgroup(&group_id);
        } else {
            return CommandResponse::error(format!("Grupo pai não encontrado: {}", parent_id));
        }

        match storage.add_group(group) {
            Ok(_) => CommandResponse::success(group_id),
            Err(e) => CommandResponse::error(e.to_string()),
        }
    } else {
        let mut storage = storage.lock().unwrap();
        match storage.add_group(group) {
            Ok(_) => CommandResponse::success(group_id),
            Err(e) => CommandResponse::error(e.to_string()),
        }
    }
}

#[command]
pub fn update_group(
    storage: State<'_, StorageState>,
    id: String,
    name: String,
) -> CommandResponse<()> {
    let mut storage = storage.lock().unwrap();

    let mut group = match storage.get_group(&id) {
        Some(g) => g.clone(),
        None => return CommandResponse::error(format!("Grupo não encontrado: {}", id)),
    };

    group.name = name;

    match storage.update_group(group) {
        Ok(_) => CommandResponse::success(()),
        Err(e) => CommandResponse::error(e.to_string()),
    }
}

#[command]
pub fn delete_group(storage: State<'_, StorageState>, id: String) -> CommandResponse<()> {
    let mut storage = storage.lock().unwrap();

    match storage.delete_group(&id) {
        Ok(_) => CommandResponse::success(()),
        Err(e) => CommandResponse::error(e.to_string()),
    }
}

#[command]
pub fn get_group(storage: State<'_, StorageState>, id: String) -> CommandResponse<Group> {
    let storage = storage.lock().unwrap();

    match storage.get_group(&id) {
        Some(group) => CommandResponse::success(group.clone()),
        None => CommandResponse::error(format!("Grupo não encontrado: {}", id)),
    }
}

#[command]
pub fn list_groups(storage: State<'_, StorageState>) -> CommandResponse<Vec<Group>> {
    let storage = storage.lock().unwrap();
    let groups = storage.list_groups().into_iter().cloned().collect();
    CommandResponse::success(groups)
}

#[command]
pub fn add_host_to_group(
    storage: State<'_, StorageState>,
    host_id: String,
    group_id: String,
) -> CommandResponse<()> {
    let mut storage = storage.lock().unwrap();

    // Verificar se o host existe
    if storage.get_host(&host_id).is_none() {
        return CommandResponse::error(format!("Host não encontrado: {}", host_id));
    }

    // Verificar se o grupo existe
    if storage.get_group(&group_id).is_none() {
        return CommandResponse::error(format!("Grupo não encontrado: {}", group_id));
    }

    // Adicionar grupo ao host
    if let Some(host) = storage.get_host_mut(&host_id) {
        host.add_to_group(&group_id);
    }

    // Adicionar host ao grupo
    if let Some(group) = storage.get_group_mut(&group_id) {
        group.add_host(&host_id);
    }

    match storage.save() {
        Ok(_) => CommandResponse::success(()),
        Err(e) => CommandResponse::error(e.to_string()),
    }
}

#[command]
pub fn remove_host_from_group(
    storage: State<'_, StorageState>,
    host_id: String,
    group_id: String,
) -> CommandResponse<()> {
    let mut storage = storage.lock().unwrap();

    // Remover grupo do host
    if let Some(host) = storage.get_host_mut(&host_id) {
        host.remove_from_group(&group_id);
    }

    // Remover host do grupo
    if let Some(group) = storage.get_group_mut(&group_id) {
        group.remove_host(&host_id);
    }

    match storage.save() {
        Ok(_) => CommandResponse::success(()),
        Err(e) => CommandResponse::error(e.to_string()),
    }
}

// Comandos para Tags
#[command]
pub fn create_tag(
    storage: State<'_, StorageState>,
    name: String,
    color: String,
) -> CommandResponse<String> {
    let tag = Tag::new(name, color);
    let tag_id = tag.id.clone();

    let mut storage = storage.lock().unwrap();
    match storage.add_tag(tag) {
        Ok(_) => CommandResponse::success(tag_id),
        Err(e) => CommandResponse::error(e.to_string()),
    }
}

#[command]
pub fn update_tag(
    storage: State<'_, StorageState>,
    id: String,
    name: String,
    color: String,
) -> CommandResponse<()> {
    let mut storage = storage.lock().unwrap();

    let mut tag = match storage.get_tag(&id) {
        Some(t) => t.clone(),
        None => return CommandResponse::error(format!("Tag não encontrada: {}", id)),
    };

    tag.name = name;
    tag.color = color;

    match storage.update_tag(tag) {
        Ok(_) => CommandResponse::success(()),
        Err(e) => CommandResponse::error(e.to_string()),
    }
}

#[command]
pub fn delete_tag(storage: State<'_, StorageState>, id: String) -> CommandResponse<()> {
    let mut storage = storage.lock().unwrap();

    match storage.delete_tag(&id) {
        Ok(_) => CommandResponse::success(()),
        Err(e) => CommandResponse::error(e.to_string()),
    }
}

#[command]
pub fn list_tags(storage: State<'_, StorageState>) -> CommandResponse<Vec<Tag>> {
    let storage = storage.lock().unwrap();
    let tags = storage.list_tags().into_iter().cloned().collect();
    CommandResponse::success(tags)
}

#[command]
pub fn add_tag_to_host(
    storage: State<'_, StorageState>,
    host_id: String,
    tag_id: String,
) -> CommandResponse<()> {
    let mut storage = storage.lock().unwrap();

    // Verificar se o host existe
    if storage.get_host(&host_id).is_none() {
        return CommandResponse::error(format!("Host não encontrado: {}", host_id));
    }

    // Verificar se a tag existe
    if storage.get_tag(&tag_id).is_none() {
        return CommandResponse::error(format!("Tag não encontrada: {}", tag_id));
    }

    // Adicionar tag ao host
    if let Some(host) = storage.get_host_mut(&host_id) {
        host.add_tag(&tag_id);
    }

    match storage.save() {
        Ok(_) => CommandResponse::success(()),
        Err(e) => CommandResponse::error(e.to_string()),
    }
}

#[command]
pub fn remove_tag_from_host(
    storage: State<'_, StorageState>,
    host_id: String,
    tag_id: String,
) -> CommandResponse<()> {
    let mut storage = storage.lock().unwrap();

    // Remover tag do host
    if let Some(host) = storage.get_host_mut(&host_id) {
        host.remove_tag(&tag_id);
    }

    match storage.save() {
        Ok(_) => CommandResponse::success(()),
        Err(e) => CommandResponse::error(e.to_string()),
    }
}

// Comandos para visualização da estrutura
#[command]
pub fn get_hosts_in_group(
    storage: State<'_, StorageState>,
    group_id: String,
) -> CommandResponse<Vec<Host>> {
    let storage = storage.lock().unwrap();
    let hosts = storage
        .get_hosts_in_group(&group_id)
        .into_iter()
        .cloned()
        .collect();
    CommandResponse::success(hosts)
}

#[command]
pub fn get_subgroups(
    storage: State<'_, StorageState>,
    group_id: String,
) -> CommandResponse<Vec<Group>> {
    let storage = storage.lock().unwrap();
    let groups = storage
        .get_subgroups(&group_id)
        .into_iter()
        .cloned()
        .collect();
    CommandResponse::success(groups)
}

#[command]
pub fn get_hosts_with_tag(
    storage: State<'_, StorageState>,
    tag_id: String,
) -> CommandResponse<Vec<Host>> {
    let storage = storage.lock().unwrap();
    let hosts = storage
        .get_hosts_with_tag(&tag_id)
        .into_iter()
        .cloned()
        .collect();
    CommandResponse::success(hosts)
}

// Comando para exportar a estrutura
#[command]
pub fn export_structure(storage: State<'_, StorageState>) -> CommandResponse<String> {
    let storage = storage.lock().unwrap();

    let result = serde_json::to_string_pretty(&storage.list_groups()).and_then(|groups_json| {
        let hosts_json = serde_json::to_string_pretty(&storage.list_hosts())?;
        let tags_json = serde_json::to_string_pretty(&storage.list_tags())?;

        Ok(format!(
            "ESTRUTURA DO SISTEMA DE GERENCIAMENTO DE HOSTS\n\n\
                GRUPOS:\n{}\n\n\
                HOSTS:\n{}\n\n\
                TAGS:\n{}",
            groups_json, hosts_json, tags_json
        ))
    });

    match result {
        Ok(structure) => CommandResponse::success(structure),
        Err(e) => CommandResponse::error(e.to_string()),
    }
}
