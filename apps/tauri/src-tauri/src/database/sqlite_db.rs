use rusqlite::{Connection, Result};
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::AppHandle;
use tauri::Manager;

pub struct SqliteDatabase {
    conn: Arc<Mutex<Connection>>,
    base_path: PathBuf,
}

impl SqliteDatabase {
    pub fn init(app: &AppHandle) -> Result<Self, String> {
        let app_data_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get app data directory: {}", e))?;

        if !app_data_dir.exists() {
            fs::create_dir_all(&app_data_dir)
                .map_err(|e| format!("Failed to create app data directory: {}", e))?;
        }

        let db_path = app_data_dir.join("database.sqlite");
        println!("Initializing SQLite database at: {:?}", db_path);

        let conn =
            Connection::open(db_path).map_err(|e| format!("Failed to open database: {}", e))?;

        // Enable foreign keys
        conn.execute("PRAGMA foreign_keys = ON", [])
            .map_err(|e| format!("Failed to enable foreign keys: {}", e))?;

        let db = Self {
            conn: Arc::new(Mutex::new(conn)),
            base_path: app_data_dir,
        };

        db.create_schema()
            .map_err(|e| format!("Failed to create schema: {}", e))?;

        Ok(db)
    }

    fn create_schema(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        // Topics Table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS topics (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                slug TEXT NOT NULL,
                icon TEXT,
                color TEXT,
                subtopics TEXT, -- JSON array
                order_index INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )?;

        // Questions Table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS questions (
                id TEXT PRIMARY KEY,
                topic_id TEXT NOT NULL,
                subtopic TEXT,
                question_number INTEGER NOT NULL,
                question TEXT NOT NULL,
                answer TEXT NOT NULL, -- JSON { markdown: ... }
                tags TEXT, -- JSON array
                difficulty TEXT,
                order_index INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
            )",
            [],
        )?;

        // Progress Table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS progress (
                question_id TEXT PRIMARY KEY,
                topic_id TEXT NOT NULL,
                status TEXT NOT NULL,
                confidence_level INTEGER DEFAULT 0,
                times_reviewed INTEGER DEFAULT 0,
                times_correct INTEGER DEFAULT 0,
                times_incorrect INTEGER DEFAULT 0,
                last_reviewed_at TEXT,
                next_review_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
                FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
            )",
            [],
        )?;

        // Quiz Sessions Table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS quiz_sessions (
                id TEXT PRIMARY KEY,
                session_type TEXT NOT NULL,
                topic_ids TEXT, -- JSON array
                question_ids TEXT, -- JSON array
                current_index INTEGER DEFAULT 0,
                started_at TEXT NOT NULL,
                completed_at TEXT,
                results TEXT -- JSON array of QuizResult
            )",
            [],
        )?;

        Ok(())
    }

    pub fn get_connection(&self) -> Arc<Mutex<Connection>> {
        self.conn.clone()
    }

    pub fn get_path(&self) -> PathBuf {
        self.base_path.join("database.sqlite")
    }
}
