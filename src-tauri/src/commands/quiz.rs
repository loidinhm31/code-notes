use crate::database::LazyDatabase;
use crate::database::models::{QuizSession, CreateQuizSessionDto, QuizResult};
use crate::database::repository::QuizSessionRepository;
use std::sync::Arc;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub async fn create_quiz_session(
    dto: CreateQuizSessionDto,
    app: AppHandle,
) -> Result<QuizSession, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let repo = QuizSessionRepository::new(Arc::clone(db.inner()));
    repo.create(dto)
}

#[tauri::command]
pub async fn get_quiz_session(
    session_id: String,
    app: AppHandle,
) -> Result<Option<QuizSession>, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let repo = QuizSessionRepository::new(Arc::clone(db.inner()));
    repo.get_by_id(&session_id)
}

#[tauri::command]
pub async fn get_active_quiz_session(app: AppHandle) -> Result<Option<QuizSession>, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let repo = QuizSessionRepository::new(Arc::clone(db.inner()));
    repo.get_active()
}

#[tauri::command]
pub async fn submit_quiz_answer(
    session_id: String,
    result: QuizResult,
    app: AppHandle,
) -> Result<QuizSession, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let repo = QuizSessionRepository::new(Arc::clone(db.inner()));
    repo.submit_result(&session_id, result)
}

#[tauri::command]
pub async fn complete_quiz_session(
    session_id: String,
    app: AppHandle,
) -> Result<QuizSession, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let repo = QuizSessionRepository::new(Arc::clone(db.inner()));
    repo.complete(&session_id)
}

#[tauri::command]
pub async fn get_quiz_history(
    limit: Option<i32>,
    app: AppHandle,
) -> Result<Vec<QuizSession>, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let repo = QuizSessionRepository::new(Arc::clone(db.inner()));
    repo.get_history(limit)
}
