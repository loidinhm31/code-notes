use lru::LruCache;
use std::fs;
use std::num::NonZeroUsize;
use std::path::PathBuf;
use std::sync::{Arc, RwLock, RwLockReadGuard, RwLockWriteGuard};
use tauri::{AppHandle, Manager};

use super::models::{
    DatabaseIndex, Question, Topic, TopicQuestions, TopicsContainer,
};

/// Configuration for the lazy database
#[derive(Debug, Clone)]
pub struct LazyDbConfig {
    /// Maximum number of topics to keep in cache
    pub cache_capacity: usize,
    /// Whether to auto-save after mutations
    pub auto_save: bool,
}

impl Default for LazyDbConfig {
    fn default() -> Self {
        Self {
            cache_capacity: 10, // Keep up to 10 topics in cache
            auto_save: true,
        }
    }
}

/// Lazy-loading database with indexed access
pub struct LazyDatabase {
    /// Index: always in memory (~5-10KB)
    index: Arc<RwLock<DatabaseIndex>>,

    /// Topics: always in memory (~50KB)
    topics: Arc<RwLock<Vec<Topic>>>,

    /// Questions cache: LRU cache for lazy-loaded questions
    questions_cache: Arc<RwLock<LruCache<String, TopicQuestions>>>,

    /// Base path for database directory
    base_path: PathBuf,

    /// Configuration
    config: LazyDbConfig,
}

impl LazyDatabase {
    /// Initialize the lazy database from the app's data directory
    pub fn init(app: &AppHandle) -> Result<Self, String> {
        Self::init_with_config(app, LazyDbConfig::default())
    }

    /// Initialize with custom configuration
    pub fn init_with_config(app: &AppHandle, config: LazyDbConfig) -> Result<Self, String> {
        let base_path = Self::get_database_base_path(app)?;

        // Ensure the base directory exists
        fs::create_dir_all(&base_path)
            .map_err(|e| format!("Failed to create database directory: {}", e))?;

        // Check if this is a new database or needs migration
        let index_path = base_path.join("index.json");
        let topics_path = base_path.join("topics.json");

        let (index, topics) = if index_path.exists() && topics_path.exists() {
            // Load existing database
            println!("Loading existing database from: {:?}", base_path);
            let index = Self::load_index_from_file(&index_path)?;
            let topics_container = Self::load_topics_from_file(&topics_path)?;
            (index, topics_container.topics)
        } else {
            // Check for v1.0 database to migrate
            let old_db_path = app
                .path()
                .app_data_dir()
                .map_err(|e| format!("Failed to get app data directory: {}", e))?
                .join("database.json");

            if old_db_path.exists() {
                println!("Found v1.0 database, migration will be handled separately");
                // Return empty database for now, migration will be handled later
                (DatabaseIndex::default(), Vec::new())
            } else {
                // Create new v2.0 database
                println!("Creating new database at: {:?}", base_path);
                (DatabaseIndex::default(), Vec::new())
            }
        };

        // Initialize LRU cache
        let cache_capacity = NonZeroUsize::new(config.cache_capacity)
            .ok_or_else(|| "Cache capacity must be greater than 0".to_string())?;
        let questions_cache = LruCache::new(cache_capacity);

        let db = Self {
            index: Arc::new(RwLock::new(index)),
            topics: Arc::new(RwLock::new(topics)),
            questions_cache: Arc::new(RwLock::new(questions_cache)),
            base_path,
            config,
        };

        // Save initial state if new
        if db.read_index().topics_index.is_empty() {
            db.save_index()?;
            db.save_topics()?;
        }

        Ok(db)
    }

    /// Get the base path for the database directory
    fn get_database_base_path(app: &AppHandle) -> Result<PathBuf, String> {
        let app_data_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get app data directory: {}", e))?;

        Ok(app_data_dir.join("database"))
    }

    /// Load index from file
    fn load_index_from_file(path: &PathBuf) -> Result<DatabaseIndex, String> {
        let contents = fs::read_to_string(path)
            .map_err(|e| format!("Failed to read index file: {}", e))?;

        let index: DatabaseIndex = serde_json::from_str(&contents)
            .map_err(|e| format!("Failed to parse index JSON: {}", e))?;

        Ok(index)
    }

    /// Load topics from file
    fn load_topics_from_file(path: &PathBuf) -> Result<TopicsContainer, String> {
        let contents = fs::read_to_string(path)
            .map_err(|e| format!("Failed to read topics file: {}", e))?;

        let topics: TopicsContainer = serde_json::from_str(&contents)
            .map_err(|e| format!("Failed to parse topics JSON: {}", e))?;

        Ok(topics)
    }

    /// Load questions for a specific topic (lazy-loaded)
    fn load_topic_questions_from_file(&self, topic_id: &str) -> Result<TopicQuestions, String> {
        let file_path = self.base_path.join("topics").join(topic_id).join("questions.json");

        if !file_path.exists() {
            // If file doesn't exist, return empty questions
            return Ok(TopicQuestions::new(topic_id.to_string()));
        }

        let contents = fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read questions file for topic {}: {}", topic_id, e))?;

        let topic_questions: TopicQuestions = serde_json::from_str(&contents)
            .map_err(|e| format!("Failed to parse questions JSON for topic {}: {}", topic_id, e))?;

        Ok(topic_questions)
    }

    /// Get read access to the index
    pub fn read_index(&self) -> RwLockReadGuard<'_, DatabaseIndex> {
        self.index.read().expect("RwLock poisoned")
    }

    /// Get write access to the index
    pub fn write_index(&self) -> RwLockWriteGuard<'_, DatabaseIndex> {
        self.index.write().expect("RwLock poisoned")
    }

    /// Get read access to topics
    pub fn read_topics(&self) -> RwLockReadGuard<'_, Vec<Topic>> {
        self.topics.read().expect("RwLock poisoned")
    }

    /// Get write access to topics
    pub fn write_topics(&self) -> RwLockWriteGuard<'_, Vec<Topic>> {
        self.topics.write().expect("RwLock poisoned")
    }

    /// Get questions for a topic (from cache or load from file)
    pub fn get_topic_questions(&self, topic_id: &str) -> Result<Vec<Question>, String> {
        // First, check cache
        {
            let mut cache = self.questions_cache.write().expect("RwLock poisoned");
            if let Some(topic_questions) = cache.get(topic_id) {
                println!("Cache hit for topic: {}", topic_id);
                return Ok(topic_questions.questions.clone());
            }
        }

        // Cache miss - load from file
        println!("Cache miss for topic: {}, loading from file", topic_id);
        let topic_questions = self.load_topic_questions_from_file(topic_id)?;
        let questions = topic_questions.questions.clone();

        // Add to cache
        {
            let mut cache = self.questions_cache.write().expect("RwLock poisoned");
            cache.put(topic_id.to_string(), topic_questions);
        }

        Ok(questions)
    }

    /// Invalidate cache for a specific topic
    pub fn invalidate_topic_cache(&self, topic_id: &str) {
        let mut cache = self.questions_cache.write().expect("RwLock poisoned");
        cache.pop(topic_id);
        println!("Invalidated cache for topic: {}", topic_id);
    }

    /// Clear entire cache
    #[allow(dead_code)]
    pub fn clear_cache(&self) {
        let mut cache = self.questions_cache.write().expect("RwLock poisoned");
        cache.clear();
        println!("Cleared entire questions cache");
    }

    /// Save index to file
    pub fn save_index(&self) -> Result<(), String> {
        let index = self.read_index();
        let json = serde_json::to_string_pretty(&*index)
            .map_err(|e| format!("Failed to serialize index: {}", e))?;

        let index_path = self.base_path.join("index.json");
        fs::write(&index_path, json)
            .map_err(|e| format!("Failed to write index file: {}", e))?;

        Ok(())
    }

    /// Save topics to file
    pub fn save_topics(&self) -> Result<(), String> {
        let topics = self.read_topics();
        let container = TopicsContainer {
            version: "2.0".to_string(),
            topics: topics.clone(),
        };

        let json = serde_json::to_string_pretty(&container)
            .map_err(|e| format!("Failed to serialize topics: {}", e))?;

        let topics_path = self.base_path.join("topics.json");
        fs::write(&topics_path, json)
            .map_err(|e| format!("Failed to write topics file: {}", e))?;

        Ok(())
    }

    /// Save questions for a specific topic
    pub fn save_topic_questions(&self, topic_id: &str, questions: Vec<Question>) -> Result<(), String> {
        let topic_dir = self.base_path.join("topics").join(topic_id);

        // Ensure topic directory exists
        fs::create_dir_all(&topic_dir)
            .map_err(|e| format!("Failed to create topic directory for {}: {}", topic_id, e))?;

        let topic_questions = TopicQuestions {
            topic_id: topic_id.to_string(),
            version: "2.0".to_string(),
            questions: questions.clone(),
        };

        let json = serde_json::to_string_pretty(&topic_questions)
            .map_err(|e| format!("Failed to serialize questions for topic {}: {}", topic_id, e))?;

        let questions_path = topic_dir.join("questions.json");
        fs::write(&questions_path, json)
            .map_err(|e| format!("Failed to write questions file for topic {}: {}", topic_id, e))?;

        // Update index
        let topic_name = {
            let topics = self.read_topics();
            topics
                .iter()
                .find(|t| t.id == topic_id)
                .map(|t| t.name.clone())
                .unwrap_or_else(|| "Unknown".to_string())
        };

        let file_path = format!("topics/{}/questions.json", topic_id);
        let mut index = self.write_index();
        index.update_topic_entry(topic_id.to_string(), topic_name, &questions, file_path);
        drop(index);

        // Invalidate cache for this topic
        self.invalidate_topic_cache(topic_id);

        // Auto-save index if enabled
        if self.config.auto_save {
            self.save_index()?;
        }

        Ok(())
    }

    /// Get the database base path (for stats and debugging)
    pub fn base_path(&self) -> &PathBuf {
        &self.base_path
    }

    /// Get cache statistics
    pub fn cache_stats(&self) -> (usize, usize) {
        let cache = self.questions_cache.read().expect("RwLock poisoned");
        (cache.len(), cache.cap().get())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lazy_db_config_default() {
        let config = LazyDbConfig::default();
        assert_eq!(config.cache_capacity, 10);
        assert!(config.auto_save);
    }

    #[test]
    fn test_topic_questions_new() {
        let tq = TopicQuestions::new("topic-1".to_string());
        assert_eq!(tq.topic_id, "topic-1");
        assert_eq!(tq.version, "2.0");
        assert_eq!(tq.questions.len(), 0);
    }
}
