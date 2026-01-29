use crate::database::LazyDatabase;
use crate::database::models::{QuestionProgress, UpdateProgressDto, ProgressStatistics};
use crate::database::repository::ProgressRepository;
use std::sync::Arc;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub async fn get_all_progress(app: AppHandle) -> Result<Vec<QuestionProgress>, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let repo = ProgressRepository::new(Arc::clone(db.inner()));
    repo.get_all()
}

#[tauri::command]
pub async fn get_progress_by_question(question_id: String, app: AppHandle) -> Result<Option<QuestionProgress>, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let repo = ProgressRepository::new(Arc::clone(db.inner()));
    repo.get_by_question_id(&question_id)
}

#[tauri::command]
pub async fn get_progress_by_topic(topic_id: String, app: AppHandle) -> Result<Vec<QuestionProgress>, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let repo = ProgressRepository::new(Arc::clone(db.inner()));
    repo.get_by_topic(&topic_id)
}

#[tauri::command]
pub async fn update_question_progress(
    question_id: String,
    dto: UpdateProgressDto,
    app: AppHandle,
) -> Result<QuestionProgress, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let repo = ProgressRepository::new(Arc::clone(db.inner()));
    repo.update(&question_id, dto)
}

#[tauri::command]
pub async fn reset_question_progress(question_id: String, app: AppHandle) -> Result<bool, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let repo = ProgressRepository::new(Arc::clone(db.inner()));
    repo.reset(&question_id)
}

#[tauri::command]
pub async fn get_progress_statistics(app: AppHandle) -> Result<ProgressStatistics, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let repo = ProgressRepository::new(Arc::clone(db.inner()));
    repo.get_statistics()
}

#[tauri::command]
pub async fn get_questions_due_for_review(app: AppHandle) -> Result<Vec<QuestionProgress>, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let repo = ProgressRepository::new(Arc::clone(db.inner()));
    repo.get_questions_due_for_review()
}

#[tauri::command]
pub async fn ensure_progress_for_all_questions(app: AppHandle) -> Result<usize, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let repo = ProgressRepository::new(Arc::clone(db.inner()));
    repo.ensure_progress_for_all_questions()
}
