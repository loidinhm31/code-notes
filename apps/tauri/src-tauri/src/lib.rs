mod commands;
mod database;
mod utils;

use crate::database::LazyDatabase;
use commands::*;
use std::sync::Arc;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize Database (SQLite)
            let db = LazyDatabase::init(&app.handle()).expect("Failed to initialize database");

            app.manage(Arc::new(db));
            println!("✅ Database initialized");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Topic commands
            get_topics,
            get_topic_by_id,
            create_topic,
            update_topic,
            delete_topic,
            // Question commands
            get_questions,
            get_question_by_id,
            get_questions_by_topic,
            create_question,
            update_question,
            delete_question,
            // Query commands
            query_database,
            search_questions,
            search_topics,
            get_topic_stats,
            // Progress commands
            get_all_progress,
            get_progress_by_question,
            get_progress_by_topic,
            update_question_progress,
            reset_question_progress,
            get_progress_statistics,
            get_questions_due_for_review,
            ensure_progress_for_all_questions,
            // Quiz commands
            create_quiz_session,
            get_quiz_session,
            get_active_quiz_session,
            submit_quiz_answer,
            complete_quiz_session,
            get_quiz_history,
            // Data Management commands
            export_database,
            import_database,
            get_database_stats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
