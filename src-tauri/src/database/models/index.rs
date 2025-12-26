use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// The main index structure that's always kept in memory
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DatabaseIndex {
    pub version: String,
    pub format: String,
    pub stats: GlobalStats,
    pub topics_index: HashMap<String, TopicIndexEntry>,
    pub global_tags: HashMap<String, TagInfo>,
}

impl Default for DatabaseIndex {
    fn default() -> Self {
        Self {
            version: "2.0".to_string(),
            format: "lazy-indexed".to_string(),
            stats: GlobalStats::default(),
            topics_index: HashMap::new(),
            global_tags: HashMap::new(),
        }
    }
}

/// Global database statistics
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct GlobalStats {
    pub total_topics: usize,
    pub total_questions: usize,
}

/// Metadata for each topic in the index
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TopicIndexEntry {
    pub name: String,
    pub question_count: usize,
    pub file_path: String,
    pub tags: Vec<String>,
    pub difficulty_distribution: DifficultyDistribution,
    pub last_modified: String,
}

/// Distribution of questions by difficulty level
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct DifficultyDistribution {
    pub beginner: usize,
    pub intermediate: usize,
    pub advanced: usize,
}

/// Information about a tag across the database
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TagInfo {
    pub count: usize,
    pub topics: Vec<String>,
}

/// Container for topic questions (loaded on-demand)
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TopicQuestions {
    pub topic_id: String,
    pub version: String,
    pub questions: Vec<super::Question>,
}

impl TopicQuestions {
    pub fn new(topic_id: String) -> Self {
        Self {
            topic_id,
            version: "2.0".to_string(),
            questions: Vec::new(),
        }
    }
}

/// Container for all topics (loaded at startup)
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TopicsContainer {
    pub version: String,
    pub topics: Vec<super::Topic>,
}

impl Default for TopicsContainer {
    fn default() -> Self {
        Self {
            version: "2.0".to_string(),
            topics: Vec::new(),
        }
    }
}

impl DatabaseIndex {
    /// Update statistics based on current data
    pub fn update_stats(&mut self) {
        self.stats.total_topics = self.topics_index.len();
        self.stats.total_questions = self
            .topics_index
            .values()
            .map(|entry| entry.question_count)
            .sum();
    }

    /// Add or update a topic in the index
    pub fn update_topic_entry(
        &mut self,
        topic_id: String,
        name: String,
        questions: &[super::Question],
        file_path: String,
    ) {
        // Calculate difficulty distribution
        let mut difficulty_dist = DifficultyDistribution::default();
        let mut tags_set: Vec<String> = Vec::new();

        for question in questions {
            match question.difficulty.as_str() {
                "beginner" => difficulty_dist.beginner += 1,
                "intermediate" => difficulty_dist.intermediate += 1,
                "advanced" => difficulty_dist.advanced += 1,
                _ => {}
            }

            for tag in &question.tags {
                if !tags_set.contains(tag) {
                    tags_set.push(tag.clone());
                }
            }
        }

        let entry = TopicIndexEntry {
            name,
            question_count: questions.len(),
            file_path,
            tags: tags_set.clone(),
            difficulty_distribution: difficulty_dist,
            last_modified: chrono::Utc::now().to_rfc3339(),
        };

        self.topics_index.insert(topic_id.clone(), entry);

        // Update global tags
        for tag in tags_set {
            self.global_tags
                .entry(tag)
                .and_modify(|info| {
                    info.count = questions.len();
                    if !info.topics.contains(&topic_id) {
                        info.topics.push(topic_id.clone());
                    }
                })
                .or_insert(TagInfo {
                    count: questions.len(),
                    topics: vec![topic_id.clone()],
                });
        }

        self.update_stats();
    }

    /// Remove a topic from the index
    pub fn remove_topic(&mut self, topic_id: &str) {
        if let Some(entry) = self.topics_index.remove(topic_id) {
            // Remove from global tags
            for tag in &entry.tags {
                if let Some(tag_info) = self.global_tags.get_mut(tag) {
                    tag_info.topics.retain(|id| id != topic_id);
                    if tag_info.topics.is_empty() {
                        self.global_tags.remove(tag);
                    }
                }
            }
        }

        self.update_stats();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_database_index() {
        let index = DatabaseIndex::default();
        assert_eq!(index.version, "2.0");
        assert_eq!(index.format, "lazy-indexed");
        assert_eq!(index.stats.total_topics, 0);
        assert_eq!(index.stats.total_questions, 0);
    }

    #[test]
    fn test_update_stats() {
        let mut index = DatabaseIndex::default();

        index.topics_index.insert(
            "topic-1".to_string(),
            TopicIndexEntry {
                name: "Test Topic".to_string(),
                question_count: 10,
                file_path: "topics/topic-1/questions.json".to_string(),
                tags: vec![],
                difficulty_distribution: DifficultyDistribution::default(),
                last_modified: chrono::Utc::now().to_rfc3339(),
            },
        );

        index.update_stats();

        assert_eq!(index.stats.total_topics, 1);
        assert_eq!(index.stats.total_questions, 10);
    }
}
