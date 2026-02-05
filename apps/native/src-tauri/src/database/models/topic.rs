use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Generate a new UUID for a topic
#[allow(dead_code)]
pub fn generate_id() -> String {
    Uuid::new_v4().to_string()
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Topic {
    pub id: String,
    pub name: String,
    pub description: String,
    pub slug: String,
    pub icon: String,
    pub color: String,
    pub subtopics: Option<Vec<String>>,
    pub order: i32,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CreateTopicDto {
    pub name: String,
    pub description: String,
    pub slug: String,
    pub icon: String,
    pub color: String,
    pub subtopics: Option<Vec<String>>,
    pub order: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UpdateTopicDto {
    pub name: Option<String>,
    pub description: Option<String>,
    pub slug: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub subtopics: Option<Vec<String>>,
    pub order: Option<i32>,
}
