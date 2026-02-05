use crate::database::LazyDatabase;
use crate::database::repository::{LazyQuestionsRepository, LazyTopicsRepository};
use jql_runner::runner;
use std::sync::Arc;
use tauri::{AppHandle, Manager};

/// Query the database using jql (JSON Query Language)
/// Example queries:
/// - '.questions' - Get all questions
/// - '.topics' - Get all topics
/// - '.questions[0]' - Get first question
/// NOTE: This command will be deprecated in favor of more powerful query commands
#[tauri::command]
pub async fn query_database(
    query: String,
    app: AppHandle,
) -> Result<String, String> {
    let db = app.state::<Arc<LazyDatabase>>();

    // Build a temporary JSON structure for jql to query
    let topics_repo = LazyTopicsRepository::new(Arc::clone(db.inner()));
    let questions_repo = LazyQuestionsRepository::new(Arc::clone(db.inner()));

    let topics = topics_repo.get_all()?;
    let all_questions = questions_repo.get_all()?;

    // Create a temporary v1-like structure
    #[derive(serde::Serialize)]
    struct TempData {
        version: String,
        topics: Vec<crate::database::models::Topic>,
        questions: Vec<crate::database::models::Question>,
    }

    let temp_data = TempData {
        version: "2.0".to_string(),
        topics,
        questions: all_questions,
    };

    // Serialize to JSON Value
    let json_value = serde_json::to_value(&temp_data)
        .map_err(|e| format!("Failed to serialize database: {}", e))?;

    // Execute the jql query using raw function (handles parsing internally)
    let result = runner::raw(&query, &json_value)
        .map_err(|e| format!("JQL execution error: {}", e))?;

    // Convert result to string
    let result_str = serde_json::to_string(&result)
        .map_err(|e| format!("Failed to serialize result: {}", e))?;

    Ok(result_str)
}

/// Search questions by keyword
#[tauri::command]
pub async fn search_questions(
    keyword: String,
    app: AppHandle,
) -> Result<Vec<crate::database::models::Question>, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let repo = LazyQuestionsRepository::new(Arc::clone(db.inner()));
    repo.search(&keyword)
}

/// Search topics by keyword
#[tauri::command]
pub async fn search_topics(
    keyword: String,
    app: AppHandle,
) -> Result<Vec<crate::database::models::Topic>, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let repo = LazyTopicsRepository::new(Arc::clone(db.inner()));
    repo.search(&keyword)
}

/// Get topic statistics with question counts
#[tauri::command]
pub async fn get_topic_stats(
    app: AppHandle,
) -> Result<Vec<TopicStats>, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let topics_repo = LazyTopicsRepository::new(Arc::clone(db.inner()));
    let questions_repo = LazyQuestionsRepository::new(Arc::clone(db.inner()));

    let topics = topics_repo.get_all()?;
    let mut stats = Vec::new();

    for topic in topics {
        let question_count = questions_repo.count_by_topic(&topic.id).unwrap_or(0);
        stats.push(TopicStats {
            id: topic.id,
            name: topic.name,
            question_count,
        });
    }

    Ok(stats)
}

#[derive(serde::Serialize)]
pub struct TopicStats {
    pub id: String,
    pub name: String,
    pub question_count: usize,
}
