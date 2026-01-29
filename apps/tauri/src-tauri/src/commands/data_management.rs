use crate::database::LazyDatabase;
use crate::database::models::{Topic, Question, QuestionProgress, QuizSession}; // removed unused generate_id
use crate::database::repository::{LazyQuestionsRepository, LazyTopicsRepository, ProgressRepository, QuizSessionRepository};
use std::sync::Arc;
use tauri::{AppHandle, Manager};
use std::fs;
// use std::path::PathBuf; // Unused
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
pub struct ExportResult {
    pub success: bool,
    pub message: String,
    pub exported_path: Option<String>,
}

#[derive(Serialize)]
pub struct ImportResult {
    pub success: bool,
    pub message: String,
    pub topics_count: usize,
    pub questions_count: usize,
    pub progress_count: usize,
    pub quiz_sessions_count: usize,
}

#[derive(Serialize)]
pub struct DatabaseStats {
    pub topics_count: usize,
    pub questions_count: usize,
    pub database_size: u64,
}

#[derive(Serialize, Deserialize)]
struct DatabaseExport {
    version: String,
    exported_at: String,
    database: DatabaseContent,
    progress: ProgressData,
    quiz_sessions: QuizSessionsData,
}

#[derive(Serialize, Deserialize)]
struct DatabaseContent {
    topics: Vec<Topic>,
    questions: Vec<Question>,
}

#[derive(Serialize, Deserialize)]
struct ProgressData {
    version: String,
    data: Vec<QuestionProgress>,
}

#[derive(Serialize, Deserialize)]
struct QuizSessionsData {
    version: String,
    sessions: Vec<QuizSession>,
}

#[tauri::command]
pub async fn export_database(
    app: AppHandle,
    export_path: String,
) -> Result<ExportResult, String> {
    let db = app.state::<Arc<LazyDatabase>>();

    // Read Data using Repositories
    let topics_repo = LazyTopicsRepository::new(Arc::clone(db.inner()));
    let questions_repo = LazyQuestionsRepository::new(Arc::clone(db.inner()));
    let progress_repo = ProgressRepository::new(Arc::clone(db.inner()));
    let quiz_repo = QuizSessionRepository::new(Arc::clone(db.inner()));

    let topics = topics_repo.get_all()?;
    let questions = questions_repo.get_all()?;
    let progress = progress_repo.get_all()?;
    let sessions = quiz_repo.get_all_sessions()?;

    let export_data = DatabaseExport {
        version: "2.1".to_string(),
        exported_at: chrono::Utc::now().to_rfc3339(),
        database: DatabaseContent {
            topics,
            questions,
        },
        progress: ProgressData {
            version: "2.1".to_string(),
            data: progress,
        },
        quiz_sessions: QuizSessionsData {
            version: "2.1".to_string(),
            sessions,
        },
    };

    let json = serde_json::to_string_pretty(&export_data)
        .map_err(|e| format!("Serialization error: {}", e))?;

    fs::write(&export_path, json).map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(ExportResult {
        success: true,
        message: "Database exported successfully".to_string(),
        exported_path: Some(export_path),
    })
}

#[tauri::command]
pub async fn import_database(
    app: AppHandle,
    import_content: String,
    merge: bool,
) -> Result<ImportResult, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    
    let topics_repo = LazyTopicsRepository::new(Arc::clone(db.inner()));
    let questions_repo = LazyQuestionsRepository::new(Arc::clone(db.inner()));
    let _progress_repo = ProgressRepository::new(Arc::clone(db.inner()));
    let quiz_repo = QuizSessionRepository::new(Arc::clone(db.inner()));

    // Parse V2
    let data: DatabaseExport = serde_json::from_str(&import_content)
        .map_err(|e| format!("Invalid JSON format: {}", e))?;

    if !merge {
        // Clear all (Manual SQL?)
        // Or implement clear methods in repos.
        // Quickest way since we have raw access in DB struct but repos encapsulate it.
        // Let's rely on Repos or just SQL via DB conn if we exposed it. 
        // We exposed get_connection().
        let conn = db.get_connection();
        let conn = conn.lock().unwrap();
        
        // Disable FK checks to clear? Or just delete in order?
        // SQLite foreign keys are ON.
        // Delete Quiz Results (inside sessions), Progress, Questions, Topics.
        // Order: QuizSessions/Progress -> Questions -> Topics
        
        // Actually, schema:
        // progress -> questions
        // questions -> topics
        // quiz_sessions -> no FK? actually just JSON arrays of IDs.
        
        conn.execute("DELETE FROM progress", []).map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM quiz_sessions", []).map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM questions", []).map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM topics", []).map_err(|e| e.to_string())?;
    }

    // Import Topics
    let mut topics_count = 0;
    for topic in data.database.topics {
        // Check if exists
        if merge {
             if let Ok(Some(_)) = topics_repo.get_by_id(&topic.id) { continue; }
        }
        // Create DTO or manual insert?
        // Repo `create` takes `CreateTopicDto` which generates new ID/Time.
        // We want to preserve ID/data.
        // We need a `save` or `restore` method in repo, or direct SQL here.
        // Implementing direct SQL here is repetitive but safe for "Restore".
        let conn = db.get_connection();
        let conn = conn.lock().unwrap();
        let subtopics_json = serde_json::to_string(&topic.subtopics).unwrap_or("[]".to_string());
        
        conn.execute(
            "INSERT INTO topics (id, name, description, slug, icon, color, subtopics, order_index, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            rusqlite::params![topic.id, topic.name, topic.description, topic.slug, topic.icon, topic.color, subtopics_json, topic.order, topic.created_at, topic.updated_at]
        ).map_err(|e| e.to_string())?;
        topics_count += 1;
    }

    // Import Questions
    let mut questions_count = 0;
    for question in data.database.questions {
        if merge {
             if let Ok(Some(_)) = questions_repo.get_by_id(&question.id) { continue; }
        }
        
        let conn = db.get_connection();
        let conn = conn.lock().unwrap();
        let answer_json = serde_json::to_string(&question.answer).unwrap_or("{}".to_string());
        let tags_json = serde_json::to_string(&question.tags).unwrap_or("[]".to_string());
        
        conn.execute(
            "INSERT INTO questions (id, topic_id, subtopic, question_number, question, answer, tags, difficulty, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            rusqlite::params![question.id, question.topic_id, question.subtopic, question.question_number, question.question, answer_json, tags_json, question.difficulty, question.order, question.created_at, question.updated_at]
        ).map_err(|e| e.to_string())?;
        questions_count += 1;
    }
    
    // Import Progress
    let mut progress_count = 0;
    for p in data.progress.data {
        // Merge logic: Update or Skip? 
        // Typically merge overwrites progress if newer? Let's skip if exists for now or just overwrite (Update).
        // Let's use INSERT OR REPLACE for progress always?
        let conn = db.get_connection();
        let conn = conn.lock().unwrap();
        let status_str = format!("{:?}", p.status);
        
        conn.execute(
             "INSERT OR REPLACE INTO progress (question_id, topic_id, status, confidence_level, times_reviewed, times_correct, times_incorrect, last_reviewed_at, next_review_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
             rusqlite::params![p.question_id, p.topic_id, status_str, p.confidence_level, p.times_reviewed, p.times_correct, p.times_incorrect, p.last_reviewed_at, p.next_review_at, p.created_at, p.updated_at]
        ).map_err(|e| e.to_string())?;
        progress_count += 1;
    }
    
    // Import Quiz Sessions
    let mut quiz_sessions_count = 0;
    for s in data.quiz_sessions.sessions {
        // Merge: Skip if exists
        if merge {
            if let Ok(Some(_)) = quiz_repo.get_by_id(&s.id) { continue; }
        }
        
        let conn = db.get_connection();
        let conn = conn.lock().unwrap();
        let topic_ids = serde_json::to_string(&s.topic_ids).unwrap();
        let question_ids = serde_json::to_string(&s.question_ids).unwrap();
        let results = serde_json::to_string(&s.results).unwrap();
        let type_str = format!("{:?}", s.session_type);

        conn.execute(
             "INSERT INTO quiz_sessions (id, session_type, topic_ids, question_ids, current_index, started_at, completed_at, results) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
             rusqlite::params![s.id, type_str, topic_ids, question_ids, s.current_index, s.started_at, s.completed_at, results]
        ).map_err(|e| e.to_string())?;
        quiz_sessions_count += 1;
    }

    Ok(ImportResult {
        success: true,
        message: "Import complete".to_string(),
        topics_count,
        questions_count,
        progress_count,
        quiz_sessions_count,
    })
}

#[tauri::command]
pub async fn get_database_stats(app: AppHandle) -> Result<DatabaseStats, String> {
    let db = app.state::<Arc<LazyDatabase>>();
    let questions_repo = LazyQuestionsRepository::new(Arc::clone(db.inner()));
    
    // Efficient Count
    let conn = db.get_connection();
    let conn = conn.lock().unwrap();
    let topics_count: i64 = conn.query_row("SELECT count(*) FROM topics", [], |r| r.get(0)).unwrap_or(0);
    drop(conn); // Drop lock before using repo
    
    let questions_count = questions_repo.count().unwrap_or(0);
    
    // Size: Size of database file
    let path = db.get_path();
    let database_size = fs::metadata(path).map(|m| m.len()).unwrap_or(0);

    Ok(DatabaseStats {
        topics_count: topics_count as usize,
        questions_count,
        database_size,
    })
}
