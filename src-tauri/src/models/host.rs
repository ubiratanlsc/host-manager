use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Host {
    pub id: String,
    pub name: String,
    #[serde(with = "crate::crypto::encryption::encrypted_data")]
    pub ip: String,
    #[serde(with = "crate::crypto::encryption::encrypted_data")]
    pub password: String,
    #[serde(default)]
    pub tag_ids: HashSet<String>,
    #[serde(default)]
    pub group_ids: HashSet<String>,
}

impl Host {
    pub fn new(name: String, ip: String, password: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            ip,
            password,
            tag_ids: HashSet::new(),
            group_ids: HashSet::new(),
        }
    }

    pub fn add_tag(&mut self, tag_id: &str) {
        self.tag_ids.insert(tag_id.to_string());
    }

    pub fn remove_tag(&mut self, tag_id: &str) {
        self.tag_ids.remove(tag_id);
    }

    pub fn add_to_group(&mut self, group_id: &str) {
        self.group_ids.insert(group_id.to_string());
    }

    pub fn remove_from_group(&mut self, group_id: &str) {
        self.group_ids.remove(group_id);
    }
}
