use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: String,
}

impl Tag {
    pub fn new(name: String, color: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            color,
        }
    }
}
