mod auth;
mod commands;
mod database;
mod sync;
mod utils;

use crate::auth::AuthService;
use crate::database::LazyDatabase;
use crate::sync::SyncService;
use commands::*;
use std::sync::Arc;
use tauri::Manager;

// Sync commands
#[tauri::command]
async fn sync_now(app: tauri::AppHandle) -> Result<sync::SyncResult, String> {
    let sync_service = app.state::<Arc<SyncService>>();
    sync_service.sync_now(&app).await
}

#[tauri::command]
async fn get_sync_status(app: tauri::AppHandle) -> Result<sync::SyncStatus, String> {
    let sync_service = app.state::<Arc<SyncService>>();
    sync_service.get_sync_status(&app).await
}

#[tauri::command]
async fn sync_login(app: tauri::AppHandle, email: String, password: String) -> Result<auth::AuthResponse, String> {
    let auth_service = app.state::<Arc<std::sync::Mutex<AuthService>>>();
    let auth = auth_service.lock().map_err(|e| format!("Failed to lock auth: {}", e))?.clone();
    auth.login(&app, email, password).await
}

#[tauri::command]
async fn sync_logout(app: tauri::AppHandle) -> Result<(), String> {
    let auth_service = app.state::<Arc<std::sync::Mutex<AuthService>>>();
    let auth = auth_service.lock().map_err(|e| format!("Failed to lock auth: {}", e))?.clone();
    auth.logout(&app).await
}

#[tauri::command]
async fn get_auth_status(app: tauri::AppHandle) -> Result<auth::AuthStatus, String> {
    let auth_service = app.state::<Arc<std::sync::Mutex<AuthService>>>();
    let auth = auth_service.lock().map_err(|e| format!("Failed to lock auth: {}", e))?.clone();
    Ok(auth.get_auth_status(&app).await)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            // Initialize Database (SQLite)
            let db = LazyDatabase::init(&app.handle()).expect("Failed to initialize database");
            let db = Arc::new(db);
            app.manage(db.clone());

            // Initialize Auth Service
            let server_url = std::env::var("SYNC_SERVER_URL").unwrap_or_default();
            let app_id = std::env::var("SYNC_APP_ID").unwrap_or_else(|_| "code-notes".to_string());
            let api_key = std::env::var("SYNC_API_KEY").unwrap_or_default();

            let auth_service = AuthService::new(server_url, app_id, api_key);
            let auth = Arc::new(std::sync::Mutex::new(auth_service));
            app.manage(auth.clone());

            // Initialize Sync Service
            let sync_service = SyncService::new(db, auth);
            app.manage(Arc::new(sync_service));

            println!("Database initialized");
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
            // Sync commands
            sync_now,
            get_sync_status,
            sync_login,
            sync_logout,
            get_auth_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
