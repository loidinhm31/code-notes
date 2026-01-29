use crate::database::LazyDatabase;
use crate::database::models::{CreateTopicDto, Topic, UpdateTopicDto};
use crate::database::repository::LazyTopicsRepository;
use std::sync::Arc;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub async fn get_topics(app: AppHandle) -> Result<Vec<Topic>, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let repo = LazyTopicsRepository::new(Arc::clone(db.inner()));
    repo.get_all()
}

#[tauri::command]
pub async fn get_topic_by_id(id: String, app: AppHandle) -> Result<Option<Topic>, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let repo = LazyTopicsRepository::new(Arc::clone(db.inner()));
    repo.get_by_id(&id)
}

#[tauri::command]
pub async fn create_topic(dto: CreateTopicDto, app: AppHandle) -> Result<String, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let repo = LazyTopicsRepository::new(Arc::clone(db.inner()));
    let topic = repo.create(dto)?;
    Ok(topic.id)
}

#[tauri::command]
pub async fn update_topic(id: String, dto: UpdateTopicDto, app: AppHandle) -> Result<bool, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let repo = LazyTopicsRepository::new(Arc::clone(db.inner()));
    let result = repo.update(&id, dto)?;
    Ok(result.is_some())
}

#[tauri::command]
pub async fn delete_topic(id: String, app: AppHandle) -> Result<bool, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let repo = LazyTopicsRepository::new(Arc::clone(db.inner()));
    repo.delete(&id)
}
