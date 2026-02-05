use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::Utc;

/// Generate a new UUID
#[allow(dead_code)]
pub fn generate_id() -> String {
    Uuid::new_v4().to_string()
}

/// Progress status for a question
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum ProgressStatus {
    NotStudied,
    Studying,
    Mastered,
    NeedsReview,
}

impl Default for ProgressStatus {
    fn default() -> Self {
        ProgressStatus::NotStudied
    }
}

/// Question progress tracking
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct QuestionProgress {
    #[serde(rename = "questionId")]
    pub question_id: String,
    #[serde(rename = "topicId")]
    pub topic_id: String,
    pub status: ProgressStatus,
    #[serde(rename = "confidenceLevel")]
    pub confidence_level: i32, // 0-5 scale
    #[serde(rename = "timesReviewed")]
    pub times_reviewed: i32,
    #[serde(rename = "timesCorrect")]
    pub times_correct: i32,
    #[serde(rename = "timesIncorrect")]
    pub times_incorrect: i32,
    #[serde(rename = "lastReviewedAt", skip_serializing_if = "Option::is_none")]
    pub last_reviewed_at: Option<String>,
    #[serde(rename = "nextReviewAt", skip_serializing_if = "Option::is_none")]
    pub next_review_at: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

impl QuestionProgress {
    /// Create a new progress entry with default values
    pub fn new(question_id: String, topic_id: String) -> Self {
        let now = Utc::now().to_rfc3339();
        Self {
            question_id,
            topic_id,
            status: ProgressStatus::NotStudied,
            confidence_level: 0,
            times_reviewed: 0,
            times_correct: 0,
            times_incorrect: 0,
            last_reviewed_at: None,
            next_review_at: None,
            created_at: now.clone(),
            updated_at: now,
        }
    }
}

/// DTO for updating question progress
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UpdateProgressDto {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<ProgressStatus>,
    #[serde(rename = "confidenceLevel", skip_serializing_if = "Option::is_none")]
    pub confidence_level: Option<i32>,
    #[serde(rename = "wasCorrect", skip_serializing_if = "Option::is_none")]
    pub was_correct: Option<bool>, // For quiz results
}

/// Quiz session type
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum QuizSessionType {
    Random,
    Sequential,
    QuickRefresher, // Only mastered questions
    TopicFocused,
    DifficultyFocused,
}

/// Quiz result for a single question
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct QuizResult {
    #[serde(rename = "questionId")]
    pub question_id: String,
    #[serde(rename = "wasCorrect")]
    pub was_correct: bool,
    #[serde(rename = "confidenceRating")]
    pub confidence_rating: i32, // 1-5 stars
    #[serde(rename = "timeSpentSeconds", skip_serializing_if = "Option::is_none")]
    pub time_spent_seconds: Option<i32>,
    #[serde(rename = "answeredAt")]
    pub answered_at: String,
}

/// Quiz session
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct QuizSession {
    pub id: String,
    #[serde(rename = "sessionType")]
    pub session_type: QuizSessionType,
    #[serde(rename = "topicIds")]
    pub topic_ids: Vec<String>,
    #[serde(rename = "questionIds")]
    pub question_ids: Vec<String>,
    #[serde(rename = "currentIndex")]
    pub current_index: i32,
    #[serde(rename = "startedAt")]
    pub started_at: String,
    #[serde(rename = "completedAt", skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<String>,
    pub results: Vec<QuizResult>,
}

impl QuizSession {
    /// Create a new quiz session
    pub fn new(
        session_type: QuizSessionType,
        topic_ids: Vec<String>,
        question_ids: Vec<String>,
    ) -> Self {
        let now = Utc::now().to_rfc3339();
        Self {
            id: generate_id(),
            session_type,
            topic_ids,
            question_ids,
            current_index: 0,
            started_at: now,
            completed_at: None,
            results: Vec::new(),
        }
    }

    /// Check if the session is completed
    pub fn is_completed(&self) -> bool {
        self.completed_at.is_some()
    }

}

/// DTO for creating a quiz session
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CreateQuizSessionDto {
    #[serde(rename = "sessionType")]
    pub session_type: QuizSessionType,
    #[serde(rename = "topicIds", skip_serializing_if = "Option::is_none")]
    pub topic_ids: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub difficulty: Option<String>,
    #[serde(rename = "maxQuestions", skip_serializing_if = "Option::is_none")]
    pub max_questions: Option<i32>,
}

/// Progress statistics
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProgressStatistics {
    #[serde(rename = "notStudied")]
    pub not_studied: usize,
    pub studying: usize,
    pub mastered: usize,
    #[serde(rename = "needsReview")]
    pub needs_review: usize,
    #[serde(rename = "totalQuestions")]
    pub total_questions: usize,
    #[serde(rename = "averageConfidence")]
    pub average_confidence: f32,
    #[serde(rename = "questionsReviewedToday")]
    pub questions_reviewed_today: usize,
    #[serde(rename = "questionsDueForReview")]
    pub questions_due_for_review: usize,
}

impl Default for ProgressStatistics {
    fn default() -> Self {
        Self {
            not_studied: 0,
            studying: 0,
            mastered: 0,
            needs_review: 0,
            total_questions: 0,
            average_confidence: 0.0,
            questions_reviewed_today: 0,
            questions_due_for_review: 0,
        }
    }
}

/// Container for progress data persistence
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProgressContainer {
    pub version: String,
    pub progress: Vec<QuestionProgress>,
}

impl Default for ProgressContainer {
    fn default() -> Self {
        Self {
            version: "2.1".to_string(),
            progress: Vec::new(),
        }
    }
}

/// Quiz sessions index for lazy loading
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct QuizSessionsIndex {
    pub version: String,
    #[serde(rename = "sessionIds")]
    pub session_ids: Vec<String>,
    #[serde(rename = "totalSessions")]
    pub total_sessions: usize,
}

impl Default for QuizSessionsIndex {
    fn default() -> Self {
        Self {
            version: "2.1".to_string(),
            session_ids: Vec::new(),
            total_sessions: 0,
        }
    }
}
