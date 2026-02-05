use crate::database::LazyDatabase;
use crate::database::models::{CreateQuestionDto, Question, UpdateQuestionDto};
use crate::database::repository::LazyQuestionsRepository;
use std::sync::Arc;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub async fn get_questions(app: AppHandle) -> Result<Vec<Question>, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let repo = LazyQuestionsRepository::new(Arc::clone(db.inner()));
    repo.get_all()
}

#[tauri::command]
pub async fn get_question_by_id(id: String, app: AppHandle) -> Result<Option<Question>, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let repo = LazyQuestionsRepository::new(Arc::clone(db.inner()));
    repo.get_by_id(&id)
}

#[tauri::command]
pub async fn get_questions_by_topic(topic_id: String, app: AppHandle) -> Result<Vec<Question>, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let repo = LazyQuestionsRepository::new(Arc::clone(db.inner()));
    repo.get_by_topic_id(&topic_id)
}

#[tauri::command]
pub async fn create_question(dto: CreateQuestionDto, app: AppHandle) -> Result<String, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let repo = LazyQuestionsRepository::new(Arc::clone(db.inner()));
    let question = repo.create(dto)?;
    Ok(question.id)
}

#[tauri::command]
pub async fn update_question(id: String, dto: UpdateQuestionDto, app: AppHandle) -> Result<bool, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let repo = LazyQuestionsRepository::new(Arc::clone(db.inner()));
    let result = repo.update(&id, dto)?;
    Ok(result.is_some())
}

#[tauri::command]
pub async fn delete_question(id: String, app: AppHandle) -> Result<bool, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let repo = LazyQuestionsRepository::new(Arc::clone(db.inner()));
    repo.delete(&id)
}
