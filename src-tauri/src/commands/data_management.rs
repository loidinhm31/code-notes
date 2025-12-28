use crate::database::LazyDatabase;
use crate::database::repository::{LazyQuestionsRepository, QuizSessionRepository};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::sync::Arc;
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
pub struct ExportResult {
    pub success: bool,
    pub message: String,
    pub exported_path: Option<String>,
}

#[derive(Serialize)]
pub struct ImportResult {
    pub success: bool,
    pub message: String,
    pub topics_count: usize,
    pub questions_count: usize,
    pub progress_count: usize,
    pub quiz_sessions_count: usize,
}

#[derive(Serialize)]
pub struct DatabaseStats {
    pub topics_count: usize,
    pub questions_count: usize,
    pub database_size: u64,
}

/// Temporary v1-like structure for export/import compatibility
#[derive(Serialize, Deserialize)]
struct DatabaseV1Export {
    version: String,
    topics: Vec<crate::database::models::Topic>,
    questions: Vec<crate::database::models::Question>,
}

/// Enhanced v2 export structure with progress and quiz sessions
#[derive(Serialize, Deserialize)]
struct DatabaseV2Export {
    version: String,
    exported_at: String,
    database: DatabaseContent,
    progress: ProgressData,
    quiz_sessions: QuizSessionsData,
}

#[derive(Serialize, Deserialize)]
struct DatabaseContent {
    topics: Vec<crate::database::models::Topic>,
    questions: Vec<crate::database::models::Question>,
}

#[derive(Serialize, Deserialize)]
struct ProgressData {
    version: String,
    data: Vec<crate::database::models::QuestionProgress>,
}

#[derive(Serialize, Deserialize)]
struct QuizSessionsData {
    version: String,
    sessions: Vec<crate::database::models::QuizSession>,
}

/// Export database to user-selected location (v2 format with progress and quiz sessions)
#[tauri::command]
pub async fn export_database(
    app: AppHandle,
    export_path: String,
) -> Result<ExportResult, String> {
    let db = app.state::<Arc<LazyDatabase>>();

    // Read topics and all questions
    let topics = db.read_topics();
    let questions_repo = LazyQuestionsRepository::new(Arc::clone(db.inner()));
    let all_questions = questions_repo.get_all()?;

    // Read progress data
    let progress = db.read_progress();

    // Read all quiz sessions
    let quiz_session_repo = QuizSessionRepository::new(Arc::clone(db.inner()));
    let all_sessions = quiz_session_repo.get_all_sessions()?;

    // Create v2 export structure with progress and quiz sessions
    let export_data = DatabaseV2Export {
        version: "2.1".to_string(),
        exported_at: Utc::now().to_rfc3339(),
        database: DatabaseContent {
            topics: topics.clone(),
            questions: all_questions,
        },
        progress: ProgressData {
            version: "2.1".to_string(),
            data: progress.clone(),
        },
        quiz_sessions: QuizSessionsData {
            version: "2.1".to_string(),
            sessions: all_sessions,
        },
    };

    let json = serde_json::to_string_pretty(&export_data)
        .map_err(|e| format!("Serialization error: {}", e))?;

    // Write to export path
    fs::write(&export_path, json).map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(ExportResult {
        success: true,
        message: "Database exported successfully (with progress and quiz sessions)".to_string(),
        exported_path: Some(export_path),
    })
}

/// Import database from user-selected file (supports v1 and v2 formats)
#[tauri::command]
pub async fn import_database(
    app: AppHandle,
    import_content: String,
    merge: bool,
) -> Result<ImportResult, String> {
    let db = app.state::<Arc<LazyDatabase>>();

    // Try to parse as v2 first, fall back to v1
    let v2_result: Result<DatabaseV2Export, _> = serde_json::from_str(&import_content);

    let (topics, questions, progress_data, quiz_sessions) = if let Ok(v2_data) = v2_result {
        // V2 format with progress and quiz sessions
        (
            v2_data.database.topics,
            v2_data.database.questions,
            Some(v2_data.progress.data),
            Some(v2_data.quiz_sessions.sessions),
        )
    } else {
        // Try v1 format
        let v1_data: DatabaseV1Export = serde_json::from_str(&import_content)
            .map_err(|e| format!("Invalid JSON format (neither v1 nor v2): {}", e))?;

        // Validate v1 data
        validate_database_v1(&v1_data)?;

        (v1_data.topics, v1_data.questions, None, None)
    };

    // Create v1-compatible structure for validation
    let validation_data = DatabaseV1Export {
        version: "1.0".to_string(),
        topics: topics.clone(),
        questions: questions.clone(),
    };
    validate_database_v1(&validation_data)?;

    // Import topics and questions
    if merge {
        // Merge: Add new items, skip duplicates by ID
        let mut db_topics = db.write_topics();
        for topic in &topics {
            if !db_topics.iter().any(|t| t.id == topic.id) {
                db_topics.push(topic.clone());
            }
        }
        drop(db_topics);

        // Group imported questions by topic and merge
        let mut questions_by_topic: std::collections::HashMap<String, Vec<crate::database::models::Question>> = std::collections::HashMap::new();
        for question in questions {
            questions_by_topic
                .entry(question.topic_id.clone())
                .or_insert_with(Vec::new)
                .push(question);
        }

        // Merge questions for each topic
        for (topic_id, new_questions) in questions_by_topic {
            let mut existing_questions = db.get_topic_questions(&topic_id).unwrap_or_default();
            for question in new_questions {
                if !existing_questions.iter().any(|q| q.id == question.id) {
                    existing_questions.push(question);
                }
            }
            db.save_topic_questions(&topic_id, existing_questions)?;
        }

        db.save_topics()?;

        // Merge progress data if available
        if let Some(imported_progress) = progress_data {
            let mut db_progress = db.write_progress();
            for progress in imported_progress {
                // Update or add progress entry
                if let Some(existing) = db_progress.iter_mut().find(|p| p.question_id == progress.question_id) {
                    *existing = progress;
                } else {
                    db_progress.push(progress);
                }
            }
            drop(db_progress);
            db.save_progress()?;
        }

        // Merge quiz sessions if available
        if let Some(imported_sessions) = quiz_sessions {
            for session in imported_sessions {
                // Save each session (will update if exists)
                db.save_quiz_session(&session)?;
                db.add_quiz_session_to_index(&session.id)?;
            }
        }
    } else {
        // Replace: Overwrite entire database
        // Clear existing topics
        {
            let mut db_topics = db.write_topics();
            db_topics.clear();
            db_topics.extend(topics.clone());
        }

        // Group questions by topic
        let mut questions_by_topic: std::collections::HashMap<String, Vec<crate::database::models::Question>> = std::collections::HashMap::new();
        for question in questions {
            questions_by_topic
                .entry(question.topic_id.clone())
                .or_insert_with(Vec::new)
                .push(question);
        }

        // Save questions for each topic
        for (topic_id, questions) in questions_by_topic {
            db.save_topic_questions(&topic_id, questions)?;
        }

        // Create empty question files for topics with no questions
        for topic in &topics {
            if !db.base_path().join("topics").join(&topic.id).exists() {
                db.save_topic_questions(&topic.id, vec![])?;
            }
        }

        db.save_topics()?;

        // Replace progress data if available
        if let Some(imported_progress) = progress_data {
            let mut db_progress = db.write_progress();
            db_progress.clear();
            db_progress.extend(imported_progress);
            drop(db_progress);
            db.save_progress()?;
        }

        // Replace quiz sessions if available
        if let Some(imported_sessions) = quiz_sessions {
            // Clear existing quiz sessions
            db.clear_quiz_sessions()?;

            // Save new sessions
            for session in imported_sessions {
                db.save_quiz_session(&session)?;
                db.add_quiz_session_to_index(&session.id)?;
            }
        }
    }

    let topics_count = db.read_topics().len();
    let index = db.read_index();
    let questions_count = index.stats.total_questions;
    let progress_count = db.read_progress().len();
    let quiz_sessions_count = db.read_quiz_sessions_index().total_sessions;

    Ok(ImportResult {
        success: true,
        message: "Database imported successfully".to_string(),
        topics_count,
        questions_count,
        progress_count,
        quiz_sessions_count,
    })
}

/// Get database statistics
#[tauri::command]
pub async fn get_database_stats(app: AppHandle) -> Result<DatabaseStats, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let index = db.read_index();

    // Calculate database size (sum of all files in database directory)
    let database_size = calculate_directory_size(db.base_path());

    Ok(DatabaseStats {
        topics_count: index.stats.total_topics,
        questions_count: index.stats.total_questions,
        database_size,
    })
}

/// Calculate the total size of a directory
fn calculate_directory_size(path: &std::path::Path) -> u64 {
    let mut total_size = 0u64;

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_file() {
                    total_size += metadata.len();
                } else if metadata.is_dir() {
                    total_size += calculate_directory_size(&entry.path());
                }
            }
        }
    }

    total_size
}

/// Validate database data (v1 format)
fn validate_database_v1(data: &DatabaseV1Export) -> Result<(), String> {
    // Check all topic IDs are valid UUIDs
    for topic in &data.topics {
        uuid::Uuid::parse_str(&topic.id)
            .map_err(|_| format!("Invalid topic ID: {}", topic.id))?;
    }

    // Check all question IDs are valid UUIDs
    for question in &data.questions {
        uuid::Uuid::parse_str(&question.id)
            .map_err(|_| format!("Invalid question ID: {}", question.id))?;
    }

    // Check all question topic_ids reference existing topics
    let topic_ids: HashSet<_> = data.topics.iter().map(|t| &t.id).collect();
    for question in &data.questions {
        if !topic_ids.contains(&question.topic_id) {
            return Err(format!(
                "Question {} references non-existent topic {}",
                question.id, question.topic_id
            ));
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::models::{Answer, Question, Topic};

    #[test]
    fn test_validate_database_valid() {
        let topic_id = uuid::Uuid::new_v4().to_string();
        let data = DatabaseV1Export {
            version: "1.0".to_string(),
            topics: vec![Topic {
                id: topic_id.clone(),
                name: "Test Topic".to_string(),
                description: "Test".to_string(),
                slug: "test-topic".to_string(),
                icon: "📚".to_string(),
                color: "#000".to_string(),
                subtopics: None,
                order: 1,
                created_at: "2024-01-01T00:00:00Z".to_string(),
                updated_at: "2024-01-01T00:00:00Z".to_string(),
            }],
            questions: vec![Question {
                id: uuid::Uuid::new_v4().to_string(),
                topic_id,
                subtopic: None,
                question_number: 1,
                question: "Test?".to_string(),
                answer: Answer {
                    markdown: "Answer".to_string(),
                },
                tags: vec![],
                difficulty: "beginner".to_string(),
                order: 1,
                created_at: "2024-01-01T00:00:00Z".to_string(),
                updated_at: "2024-01-01T00:00:00Z".to_string(),
            }],
        };

        assert!(validate_database_v1(&data).is_ok());
    }

    #[test]
    fn test_validate_database_invalid_reference() {
        let data = DatabaseV1Export {
            version: "1.0".to_string(),
            topics: vec![],
            questions: vec![Question {
                id: uuid::Uuid::new_v4().to_string(),
                topic_id: "non-existent-id".to_string(),
                subtopic: None,
                question_number: 1,
                question: "Test?".to_string(),
                answer: Answer {
                    markdown: "Answer".to_string(),
                },
                tags: vec![],
                difficulty: "beginner".to_string(),
                order: 1,
                created_at: "2024-01-01T00:00:00Z".to_string(),
                updated_at: "2024-01-01T00:00:00Z".to_string(),
            }],
        };

        assert!(validate_database_v1(&data).is_err());
    }
}
