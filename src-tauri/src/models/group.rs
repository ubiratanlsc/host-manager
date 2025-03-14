use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Group {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub host_ids: HashSet<String>,
    #[serde(default)]
    pub subgroup_ids: HashSet<String>,
    #[serde(default)]
    pub parent_id: Option<String>,
}

impl Group {
    pub fn new(name: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            host_ids: HashSet::new(),
            subgroup_ids: HashSet::new(),
            parent_id: None,
        }
    }

    pub fn add_host(&mut self, host_id: &str) {
        self.host_ids.insert(host_id.to_string());
    }

    pub fn remove_host(&mut self, host_id: &str) {
        self.host_ids.remove(host_id);
    }

    pub fn add_subgroup(&mut self, group_id: &str) {
        self.subgroup_ids.insert(group_id.to_string());
    }

    pub fn remove_subgroup(&mut self, group_id: &str) {
        self.subgroup_ids.remove(group_id);
    }

    pub fn set_parent(&mut self, parent_id: Option<String>) {
        self.parent_id = parent_id;
    }
}
