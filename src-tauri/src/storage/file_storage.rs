use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::models::{Group, Host, Tag};

#[derive(Error, Debug)]
pub enum StorageError {
    #[error("Erro de IO: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Erro de serialização: {0}")]
    SerdeError(#[from] serde_json::Error),

    #[error("Erro ao criar diretório de dados: {0}")]
    DirectoryError(String),

    #[error("Host não encontrado com ID: {0}")]
    HostNotFound(String),

    #[error("Grupo não encontrado com ID: {0}")]
    GroupNotFound(String),

    #[error("Tag não encontrada com ID: {0}")]
    TagNotFound(String),
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HostManagerData {
    pub hosts: HashMap<String, Host>,
    pub groups: HashMap<String, Group>,
    pub tags: HashMap<String, Tag>,
}

impl Default for HostManagerData {
    fn default() -> Self {
        Self {
            hosts: HashMap::new(),
            groups: HashMap::new(),
            tags: HashMap::new(),
        }
    }
}

pub struct FileStorage {
    data_dir: PathBuf,
    current_data: HostManagerData,
}

impl FileStorage {
    pub fn new(data_dir: impl AsRef<Path>) -> Result<Self, StorageError> {
        let data_dir = data_dir.as_ref().to_path_buf();

        // Criar diretório de dados, se não existir
        if !data_dir.exists() {
            fs::create_dir_all(&data_dir)
                .map_err(|e| StorageError::DirectoryError(e.to_string()))?;
        }

        let mut storage = Self {
            data_dir,
            current_data: HostManagerData::default(),
        };

        // Carregar dados existentes, se disponíveis
        if storage.data_file_exists() {
            storage.load()?;
        }

        Ok(storage)
    }

    fn data_file_path(&self) -> PathBuf {
        self.data_dir.join("host_data.json")
    }

    fn data_file_exists(&self) -> bool {
        self.data_file_path().exists()
    }

    pub fn load(&mut self) -> Result<(), StorageError> {
        let path = self.data_file_path();

        if !path.exists() {
            return Ok(());
        }

        let mut file = File::open(path)?;
        let mut contents = String::new();
        file.read_to_string(&mut contents)?;

        self.current_data = serde_json::from_str(&contents)?;

        Ok(())
    }

    pub fn save(&self) -> Result<(), StorageError> {
        let path = self.data_file_path();
        let contents = serde_json::to_string_pretty(&self.current_data)?;

        let mut file = File::create(path)?;
        file.write_all(contents.as_bytes())?;

        Ok(())
    }

    // Métodos para gerenciar hosts
    pub fn add_host(&mut self, host: Host) -> Result<(), StorageError> {
        self.current_data.hosts.insert(host.id.clone(), host);
        self.save()?;
        Ok(())
    }

    pub fn get_host(&self, id: &str) -> Option<&Host> {
        self.current_data.hosts.get(id)
    }

    pub fn get_host_mut(&mut self, id: &str) -> Option<&mut Host> {
        self.current_data.hosts.get_mut(id)
    }

    pub fn update_host(&mut self, host: Host) -> Result<(), StorageError> {
        if !self.current_data.hosts.contains_key(&host.id) {
            return Err(StorageError::HostNotFound(host.id));
        }

        self.current_data.hosts.insert(host.id.clone(), host);
        self.save()?;
        Ok(())
    }

    pub fn delete_host(&mut self, id: &str) -> Result<(), StorageError> {
        if !self.current_data.hosts.contains_key(id) {
            return Err(StorageError::HostNotFound(id.to_string()));
        }

        // Remover host dos grupos
        for group in self.current_data.groups.values_mut() {
            group.host_ids.remove(id);
        }

        self.current_data.hosts.remove(id);
        self.save()?;
        Ok(())
    }

    pub fn list_hosts(&self) -> Vec<&Host> {
        self.current_data.hosts.values().collect()
    }

    // Métodos para gerenciar grupos
    pub fn add_group(&mut self, group: Group) -> Result<(), StorageError> {
        self.current_data.groups.insert(group.id.clone(), group);
        self.save()?;
        Ok(())
    }

    pub fn get_group(&self, id: &str) -> Option<&Group> {
        self.current_data.groups.get(id)
    }

    pub fn get_group_mut(&mut self, id: &str) -> Option<&mut Group> {
        self.current_data.groups.get_mut(id)
    }

    pub fn update_group(&mut self, group: Group) -> Result<(), StorageError> {
        if !self.current_data.groups.contains_key(&group.id) {
            return Err(StorageError::GroupNotFound(group.id));
        }

        self.current_data.groups.insert(group.id.clone(), group);
        self.save()?;
        Ok(())
    }

    pub fn delete_group(&mut self, id: &str) -> Result<(), StorageError> {
        if !self.current_data.groups.contains_key(id) {
            return Err(StorageError::GroupNotFound(id.to_string()));
        }

        // Remover o grupo de todos os hosts
        for host in self.current_data.hosts.values_mut() {
            host.group_ids.remove(id);
        }

        // Remover o grupo de seus grupos pai
        for group in self.current_data.groups.values_mut() {
            group.subgroup_ids.remove(id);
        }

        self.current_data.groups.remove(id);
        self.save()?;
        Ok(())
    }

    pub fn list_groups(&self) -> Vec<&Group> {
        self.current_data.groups.values().collect()
    }

    // Métodos para gerenciar tags
    pub fn add_tag(&mut self, tag: Tag) -> Result<(), StorageError> {
        self.current_data.tags.insert(tag.id.clone(), tag);
        self.save()?;
        Ok(())
    }

    pub fn get_tag(&self, id: &str) -> Option<&Tag> {
        self.current_data.tags.get(id)
    }

    pub fn update_tag(&mut self, tag: Tag) -> Result<(), StorageError> {
        if !self.current_data.tags.contains_key(&tag.id) {
            return Err(StorageError::TagNotFound(tag.id));
        }

        self.current_data.tags.insert(tag.id.clone(), tag);
        self.save()?;
        Ok(())
    }

    pub fn delete_tag(&mut self, id: &str) -> Result<(), StorageError> {
        if !self.current_data.tags.contains_key(id) {
            return Err(StorageError::TagNotFound(id.to_string()));
        }

        // Remover a tag de todos os hosts
        for host in self.current_data.hosts.values_mut() {
            host.tag_ids.remove(id);
        }

        self.current_data.tags.remove(id);
        self.save()?;
        Ok(())
    }

    pub fn list_tags(&self) -> Vec<&Tag> {
        self.current_data.tags.values().collect()
    }

    // Métodos para visualização da estrutura
    pub fn get_hosts_in_group(&self, group_id: &str) -> Vec<&Host> {
        let group = match self.current_data.groups.get(group_id) {
            Some(g) => g,
            None => return vec![],
        };

        group
            .host_ids
            .iter()
            .filter_map(|id| self.current_data.hosts.get(id))
            .collect()
    }

    pub fn get_subgroups(&self, group_id: &str) -> Vec<&Group> {
        let group = match self.current_data.groups.get(group_id) {
            Some(g) => g,
            None => return vec![],
        };

        group
            .subgroup_ids
            .iter()
            .filter_map(|id| self.current_data.groups.get(id))
            .collect()
    }

    pub fn get_hosts_with_tag(&self, tag_id: &str) -> Vec<&Host> {
        self.current_data
            .hosts
            .values()
            .filter(|host| host.tag_ids.contains(tag_id))
            .collect()
    }
}
