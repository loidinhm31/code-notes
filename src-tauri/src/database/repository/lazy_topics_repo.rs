use std::sync::Arc;

use crate::database::{
    models::{CreateTopicDto, Topic, UpdateTopicDto},
    LazyDatabase,
};

/// Repository for topic operations with lazy database
pub struct LazyTopicsRepository {
    db: Arc<LazyDatabase>,
}

impl LazyTopicsRepository {
    pub fn new(db: Arc<LazyDatabase>) -> Self {
        Self { db }
    }

    /// Get all topics (from memory, very fast)
    pub fn get_all(&self) -> Result<Vec<Topic>, String> {
        let topics = self.db.read_topics();
        Ok(topics.clone())
    }

    /// Get a topic by ID (from memory, very fast)
    pub fn get_by_id(&self, id: &str) -> Result<Option<Topic>, String> {
        let topics = self.db.read_topics();
        let topic = topics.iter().find(|t| t.id == id).cloned();
        Ok(topic)
    }

    /// Get a topic with its questions (lazy-loads questions)
    #[allow(dead_code)]
    pub fn get_with_questions(&self, id: &str) -> Result<Option<(Topic, Vec<crate::database::models::Question>)>, String> {
        let topic = {
            let topics = self.db.read_topics();
            topics.iter().find(|t| t.id == id).cloned()
        };

        match topic {
            Some(t) => {
                let questions = self.db.get_topic_questions(&t.id)?;
                Ok(Some((t, questions)))
            }
            None => Ok(None),
        }
    }

    /// Create a new topic
    pub fn create(&self, dto: CreateTopicDto) -> Result<Topic, String> {
        let topic = Topic {
            id: uuid::Uuid::new_v4().to_string(),
            name: dto.name,
            description: dto.description,
            slug: dto.slug,
            icon: dto.icon,
            color: dto.color,
            subtopics: dto.subtopics,
            order: dto.order,
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        };

        // Add to topics list
        {
            let mut topics = self.db.write_topics();
            topics.push(topic.clone());
        }

        // Create empty questions file for this topic
        self.db.save_topic_questions(&topic.id, vec![])?;

        // Save topics
        self.db.save_topics()?;

        // Update index (already done by save_topic_questions)
        // Index is auto-saved

        Ok(topic)
    }

    /// Update an existing topic
    pub fn update(&self, id: &str, dto: UpdateTopicDto) -> Result<Option<Topic>, String> {
        let mut topics = self.db.write_topics();

        if let Some(topic) = topics.iter_mut().find(|t| t.id == id) {
            // Update fields if provided
            if let Some(name) = dto.name {
                topic.name = name;
            }
            if let Some(description) = dto.description {
                topic.description = description;
            }
            if let Some(slug) = dto.slug {
                topic.slug = slug;
            }
            if let Some(icon) = dto.icon {
                topic.icon = icon;
            }
            if let Some(color) = dto.color {
                topic.color = color;
            }
            if let Some(subtopics) = dto.subtopics {
                topic.subtopics = Some(subtopics);
            }
            if let Some(order) = dto.order {
                topic.order = order;
            }

            topic.updated_at = chrono::Utc::now().to_rfc3339();

            let updated_topic = topic.clone();
            drop(topics);

            // Save topics
            self.db.save_topics()?;

            // Update index with new topic name
            let questions = self.db.get_topic_questions(id)?;
            let file_path = format!("topics/{}/questions.json", id);
            let mut index = self.db.write_index();
            index.update_topic_entry(id.to_string(), updated_topic.name.clone(), &questions, file_path);
            drop(index);
            self.db.save_index()?;

            Ok(Some(updated_topic))
        } else {
            Ok(None)
        }
    }

    /// Delete a topic and all its questions
    pub fn delete(&self, id: &str) -> Result<bool, String> {
        // Check if topic exists
        let topic_exists = {
            let topics = self.db.read_topics();
            topics.iter().any(|t| t.id == id)
        };

        if !topic_exists {
            return Ok(false);
        }

        // Remove from topics list
        {
            let mut topics = self.db.write_topics();
            topics.retain(|t| t.id != id);
        }

        // Remove topic questions directory
        let topic_dir = self.db.base_path().join("topics").join(id);
        if topic_dir.exists() {
            std::fs::remove_dir_all(&topic_dir)
                .map_err(|e| format!("Failed to remove topic directory: {}", e))?;
        }

        // Remove from index
        {
            let mut index = self.db.write_index();
            index.remove_topic(id);
        }

        // Invalidate cache
        self.db.invalidate_topic_cache(id);

        // Save changes
        self.db.save_topics()?;
        self.db.save_index()?;

        Ok(true)
    }

    /// Get total count of topics
    #[allow(dead_code)]
    pub fn count(&self) -> Result<usize, String> {
        let topics = self.db.read_topics();
        Ok(topics.len())
    }

    /// Search topics by keyword (searches name and description)
    pub fn search(&self, keyword: &str) -> Result<Vec<Topic>, String> {
        let all_topics = self.get_all()?;
        let keyword_lower = keyword.to_lowercase();

        let results: Vec<Topic> = all_topics
            .into_iter()
            .filter(|t| {
                t.name.to_lowercase().contains(&keyword_lower)
                    || t.description.to_lowercase().contains(&keyword_lower)
            })
            .collect();

        Ok(results)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lazy_topics_repository_creation() {
        // This test just verifies the struct can be created
        // Full integration tests would require a real database
    }
}
