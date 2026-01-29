use crate::database::LazyDatabase;
use crate::database::repository::LazyQuestionsRepository;
use std::sync::Arc;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub async fn debug_database(app: AppHandle) -> Result<String, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let topics = db.read_topics();
    let index = db.read_index();
    let repo = LazyQuestionsRepository::new(Arc::clone(db.inner()));
    let all_questions = repo.get_all()?;

    let mut debug_info = String::new();

    debug_info.push_str(&format!("Database Version: {}\n", index.version));
    debug_info.push_str(&format!("Database Format: {}\n", index.format));
    debug_info.push_str(&format!("Total topics: {}\n", topics.len()));
    debug_info.push_str(&format!("Total questions: {}\n\n", all_questions.len()));

    debug_info.push_str("Topics:\n");
    for topic in topics.iter() {
        let question_count = index
            .topics_index
            .get(&topic.id)
            .map(|entry| entry.question_count)
            .unwrap_or(0);
        debug_info.push_str(&format!(
            "  - ID: {}, Name: {} ({} questions)\n",
            topic.id, topic.name, question_count
        ));
    }

    debug_info.push_str("\nQuestions (first 5):\n");
    for (i, question) in all_questions.iter().take(5).enumerate() {
        debug_info.push_str(&format!(
            "  {}. ID: {}, TopicID: {}, Question: {}\n",
            i + 1,
            question.id,
            question.topic_id,
            &question.question[..question.question.len().min(60)]
        ));
    }

    debug_info.push_str("\nCache Stats:\n");
    let (cache_size, cache_capacity) = db.cache_stats();
    debug_info.push_str(&format!(
        "  - Cache size: {}/{} topics\n",
        cache_size, cache_capacity
    ));

    Ok(debug_info)
}

#[tauri::command]
pub async fn debug_topic_questions(
    topic_id: String,
    app: AppHandle,
) -> Result<String, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let topics = db.read_topics();

    let mut debug_info = String::new();

    debug_info.push_str(&format!("Looking for questions with topic_id: {}\n\n", topic_id));

    let topic = topics.iter().find(|t| t.id == topic_id);
    if let Some(t) = topic {
        debug_info.push_str(&format!("Topic found: {}\n\n", t.name));
    } else {
        debug_info.push_str("Topic NOT found!\n\n");
    }

    let questions = db.get_topic_questions(&topic_id)?;

    debug_info.push_str(&format!("Found {} questions\n\n", questions.len()));

    for (i, q) in questions.iter().enumerate() {
        debug_info.push_str(&format!(
            "{}. [{}] {}\n",
            i + 1,
            q.question_number,
            &q.question[..q.question.len().min(80)]
        ));
    }

    Ok(debug_info)
}
