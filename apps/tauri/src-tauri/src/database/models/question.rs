use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Generate a new UUID for a question
#[allow(dead_code)]
pub fn generate_id() -> String {
    Uuid::new_v4().to_string()
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Answer {
    pub markdown: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Question {
    pub id: String,
    #[serde(rename = "topicId")]
    pub topic_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subtopic: Option<String>,
    #[serde(rename = "questionNumber")]
    pub question_number: i32,
    pub question: String,
    pub answer: Answer,
    pub tags: Vec<String>,
    pub difficulty: String, // "beginner", "intermediate", "advanced"
    pub order: i32,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CreateQuestionDto {
    #[serde(rename = "topicId")]
    pub topic_id: String,
    pub subtopic: Option<String>,
    #[serde(rename = "questionNumber")]
    pub question_number: i32,
    pub question: String,
    pub answer: Answer,
    pub tags: Vec<String>,
    pub difficulty: String,
    pub order: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UpdateQuestionDto {
    #[serde(rename = "topicId")]
    pub topic_id: Option<String>,
    pub subtopic: Option<String>,
    #[serde(rename = "questionNumber")]
    pub question_number: Option<i32>,
    pub question: Option<String>,
    pub answer: Option<Answer>,
    pub tags: Option<Vec<String>>,
    pub difficulty: Option<String>,
    pub order: Option<i32>,
}
