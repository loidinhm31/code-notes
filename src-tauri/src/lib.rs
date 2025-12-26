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
            // Initialize Lazy database
            let db = LazyDatabase::init(&app.handle()).expect("Failed to initialize Lazy database");

            app.manage(Arc::new(db));
            println!("✅ Lazy database initialized");
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
            // Import commands
            import_from_markdown,
            // Data management commands
            export_database,
            import_database,
            get_database_stats,
            // Query commands
            query_database, // Uses jql for raw JSON queries
            search_questions,
            search_topics,
            get_topic_stats,
            // Debug commands
            debug_database,
            debug_topic_questions,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
