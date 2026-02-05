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
                updated_at TEXT NOT NULL,
                sync_version INTEGER DEFAULT 1,
                synced_at INTEGER,
                deleted INTEGER DEFAULT 0,
                deleted_at INTEGER
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
                sync_version INTEGER DEFAULT 1,
                synced_at INTEGER,
                deleted INTEGER DEFAULT 0,
                deleted_at INTEGER,
                FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
            )",
            [],
        )?;

        // Progress Table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS progress (
                question_id TEXT PRIMARY KEY,
                id TEXT,
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
                sync_version INTEGER DEFAULT 1,
                synced_at INTEGER,
                deleted INTEGER DEFAULT 0,
                deleted_at INTEGER,
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
                results TEXT, -- JSON array of QuizResult
                sync_version INTEGER DEFAULT 1,
                synced_at INTEGER,
                deleted INTEGER DEFAULT 0,
                deleted_at INTEGER
            )",
            [],
        )?;

        // Sync metadata table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS sync_metadata (
                key TEXT PRIMARY KEY,
                value TEXT
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

    // =========================================================================
    // Sync helper methods
    // =========================================================================

    /// Get checkpoint from sync_metadata
    pub fn get_checkpoint(&self) -> Result<Option<(String, String)>, String> {
        let conn = self.conn.lock().unwrap();
        let updated_at: Option<String> = conn
            .query_row(
                "SELECT value FROM sync_metadata WHERE key = 'checkpoint_updated_at'",
                [],
                |row| row.get(0),
            )
            .ok();
        let id: Option<String> = conn
            .query_row(
                "SELECT value FROM sync_metadata WHERE key = 'checkpoint_id'",
                [],
                |row| row.get(0),
            )
            .ok();

        match (updated_at, id) {
            (Some(ua), Some(i)) => Ok(Some((ua, i))),
            _ => Ok(None),
        }
    }

    /// Save checkpoint to sync_metadata
    pub fn save_checkpoint(&self, updated_at: &str, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO sync_metadata (key, value) VALUES ('checkpoint_updated_at', ?)",
            rusqlite::params![updated_at],
        ).map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT OR REPLACE INTO sync_metadata (key, value) VALUES ('checkpoint_id', ?)",
            rusqlite::params![id],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    /// Execute arbitrary SQL (for sync service)
    pub fn execute_sql(&self, sql: &str, params: &[&str]) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p as &dyn rusqlite::ToSql).collect();
        conn.execute(sql, rusqlite::params_from_iter(params_refs))
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    /// Query count (for sync service)
    pub fn query_count(&self, sql: &str) -> Result<usize, String> {
        let conn = self.conn.lock().unwrap();
        let count: i64 = conn
            .query_row(sql, [], |row| row.get(0))
            .map_err(|e| e.to_string())?;
        Ok(count as usize)
    }
}
