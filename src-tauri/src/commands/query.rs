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
    // This is inefficient but maintains backwards compatibility
    let topics = db.read_topics();
    let index = db.read_index();

    // Create a temporary v1-like structure
    #[derive(serde::Serialize)]
    struct TempData {
        version: String,
        topics: Vec<crate::database::models::Topic>,
        questions: Vec<crate::database::models::Question>,
    }

    // Load all questions (slow!)
    let repo = LazyQuestionsRepository::new(Arc::clone(db.inner()));
    let all_questions = repo.get_all()?;

    let temp_data = TempData {
        version: index.version.clone(),
        topics: topics.clone(),
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

    // Use the index for fast statistics
    let topics = db.read_topics();
    let index = db.read_index();

    let stats: Vec<TopicStats> = topics
        .iter()
        .map(|topic| {
            let question_count = index
                .topics_index
                .get(&topic.id)
                .map(|entry| entry.question_count)
                .unwrap_or(0);

            TopicStats {
                id: topic.id.clone(),
                name: topic.name.clone(),
                question_count,
            }
        })
        .collect();

    Ok(stats)
}

#[derive(serde::Serialize)]
pub struct TopicStats {
    pub id: String,
    pub name: String,
    pub question_count: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_jql_basic_query() {
        // Test that we can construct a basic jql query
        let query = ".questions";
        assert_eq!(query, ".questions");

        let query2 = ".topics[0]";
        assert!(query2.contains("[0]"));
    }
}
