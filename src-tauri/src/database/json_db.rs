use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, RwLock, RwLockReadGuard, RwLockWriteGuard};
use tauri::{AppHandle, Manager};

use super::models::{Question, Topic};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[allow(dead_code)]
pub struct DatabaseData {
    pub version: String,
    pub topics: Vec<Topic>,
    pub questions: Vec<Question>,
}

impl Default for DatabaseData {
    fn default() -> Self {
        Self {
            version: "1.0".to_string(),
            topics: Vec::new(),
            questions: Vec::new(),
        }
    }
}

#[allow(dead_code)]
pub struct JsonDatabase {
    data: Arc<RwLock<DatabaseData>>,
    file_path: PathBuf,
    auto_save: bool,
}

impl JsonDatabase {
    /// Initialize the database from the app's data directory
    pub fn init(app: &AppHandle) -> Result<Self, String> {
        let file_path = Self::get_database_path(app)?;

        // Ensure the parent directory exists
        if let Some(parent) = file_path.parent() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create data directory: {}", e))?;
        }

        // Load existing data or create new
        let data = if file_path.exists() {
            match Self::load_from_file(&file_path) {
                Ok(data) => {
                    println!("Loaded existing database from: {:?}", file_path);
                    data
                }
                Err(e) => {
                    eprintln!("Database file corrupted: {}", e);
                    // Backup corrupted file
                    let backup_path = file_path.with_extension("json.backup");
                    if let Err(backup_err) = fs::copy(&file_path, &backup_path) {
                        eprintln!("Failed to backup corrupted database: {}", backup_err);
                    } else {
                        println!("Corrupted database backed up to: {:?}", backup_path);
                    }
                    // Create new database
                    println!("Creating new database");
                    DatabaseData::default()
                }
            }
        } else {
            println!("No existing database found, creating new one at: {:?}", file_path);
            DatabaseData::default()
        };

        let db = Self {
            data: Arc::new(RwLock::new(data)),
            file_path,
            auto_save: true,
        };

        // Save the initial database if it's new
        db.save()?;

        Ok(db)
    }

    /// Get the path to the database file
    fn get_database_path(app: &AppHandle) -> Result<PathBuf, String> {
        let app_data_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get app data directory: {}", e))?;

        Ok(app_data_dir.join("database.json"))
    }

    /// Load database from file
    fn load_from_file(path: &PathBuf) -> Result<DatabaseData, String> {
        let contents = fs::read_to_string(path)
            .map_err(|e| format!("Failed to read database file: {}", e))?;

        let data: DatabaseData = serde_json::from_str(&contents)
            .map_err(|e| format!("Failed to parse database JSON: {}", e))?;

        Ok(data)
    }

    /// Get read access to the database
    pub fn read(&self) -> RwLockReadGuard<'_, DatabaseData> {
        self.data.read().expect("RwLock poisoned")
    }

    /// Get write access to the database
    pub fn write(&self) -> RwLockWriteGuard<'_, DatabaseData> {
        self.data.write().expect("RwLock poisoned")
    }

    /// Save the database to file
    pub fn save(&self) -> Result<(), String> {
        let data = self.read();
        let json = serde_json::to_string_pretty(&*data)
            .map_err(|e| format!("Failed to serialize database: {}", e))?;

        fs::write(&self.file_path, json)
            .map_err(|e| format!("Failed to write database file: {}", e))?;

        Ok(())
    }

    /// Auto-save the database (called after mutations)
    pub fn auto_save(&self) -> Result<(), String> {
        if self.auto_save {
            self.save()
        } else {
            Ok(())
        }
    }

    /// Get the database file path (for stats)
    pub fn file_path(&self) -> &PathBuf {
        &self.file_path
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_database_data() {
        let data = DatabaseData::default();
        assert_eq!(data.version, "1.0");
        assert_eq!(data.topics.len(), 0);
        assert_eq!(data.questions.len(), 0);
    }
}
