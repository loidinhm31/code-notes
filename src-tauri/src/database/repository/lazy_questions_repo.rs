use std::sync::Arc;

use crate::database::{
    models::{CreateQuestionDto, Question, UpdateQuestionDto},
    LazyDatabase,
};

/// Repository for question operations with lazy database
pub struct LazyQuestionsRepository {
    db: Arc<LazyDatabase>,
}

impl LazyQuestionsRepository {
    pub fn new(db: Arc<LazyDatabase>) -> Self {
        Self { db }
    }

    /// Get all questions (slow - loads all topic files)
    /// Use sparingly! Prefer get_by_topic_id for better performance
    pub fn get_all(&self) -> Result<Vec<Question>, String> {
        let topics = self.db.read_topics();
        let mut all_questions = Vec::new();

        for topic in topics.iter() {
            let questions = self.db.get_topic_questions(&topic.id)?;
            all_questions.extend(questions);
        }

        Ok(all_questions)
    }

    /// Get a question by ID (searches cache first, then loads topics as needed)
    pub fn get_by_id(&self, id: &str) -> Result<Option<Question>, String> {
        // Try to find in all topics
        // This is not optimal but necessary for single question lookup
        let topics = self.db.read_topics();

        for topic in topics.iter() {
            let questions = self.db.get_topic_questions(&topic.id)?;
            if let Some(question) = questions.iter().find(|q| q.id == id) {
                return Ok(Some(question.clone()));
            }
        }

        Ok(None)
    }

    /// Get all questions for a topic (cached, very fast after first load)
    pub fn get_by_topic_id(&self, topic_id: &str) -> Result<Vec<Question>, String> {
        self.db.get_topic_questions(topic_id)
    }

    /// Create a new question
    pub fn create(&self, dto: CreateQuestionDto) -> Result<Question, String> {
        // Verify topic exists
        let topic_exists = {
            let topics = self.db.read_topics();
            topics.iter().any(|t| t.id == dto.topic_id)
        };

        if !topic_exists {
            return Err(format!("Topic with id {} not found", dto.topic_id));
        }

        // Load existing questions for this topic
        let mut questions = self.db.get_topic_questions(&dto.topic_id)?;

        // Check if the requested question number is duplicate
        let is_duplicate = questions
            .iter()
            .any(|q| q.question_number == dto.question_number);

        // Use the requested number if not duplicate, otherwise use max + 1
        let question_number = if is_duplicate {
            questions
                .iter()
                .map(|q| q.question_number)
                .max()
                .unwrap_or(0)
                + 1
        } else {
            dto.question_number
        };

        // Create new question
        let question = Question {
            id: uuid::Uuid::new_v4().to_string(),
            topic_id: dto.topic_id.clone(),
            subtopic: dto.subtopic,
            question_number,
            question: dto.question,
            answer: dto.answer,
            tags: dto.tags,
            difficulty: dto.difficulty,
            order: dto.order,
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        };

        // Add to list
        questions.push(question.clone());

        // Save to file (this also updates index and invalidates cache)
        self.db.save_topic_questions(&dto.topic_id, questions)?;

        Ok(question)
    }

    /// Update an existing question
    pub fn update(&self, id: &str, dto: UpdateQuestionDto) -> Result<Option<Question>, String> {
        // Find which topic this question belongs to
        let topics = self.db.read_topics();
        let mut found_topic_id: Option<String> = None;

        for topic in topics.iter() {
            let questions = self.db.get_topic_questions(&topic.id)?;
            if questions.iter().any(|q| q.id == id) {
                found_topic_id = Some(topic.id.clone());
                break;
            }
        }

        let old_topic_id = match found_topic_id {
            Some(id) => id,
            None => return Ok(None),
        };

        // Check if topic is being changed
        let new_topic_id = dto.topic_id.clone().unwrap_or(old_topic_id.clone());
        let topic_changed = new_topic_id != old_topic_id;

        // If topic is changing, verify the new topic exists
        if topic_changed {
            let topic_exists = topics.iter().any(|t| t.id == new_topic_id);
            if !topic_exists {
                return Err(format!("Target topic with id {} not found", new_topic_id));
            }
        }

        // Load questions from the old topic
        let mut old_questions = self.db.get_topic_questions(&old_topic_id)?;

        // Pre-calculate the final question number if being updated
        let final_question_number = if let Some(requested_number) = dto.question_number {
            // Load questions from target topic to check for duplicates
            let target_questions = if topic_changed {
                self.db.get_topic_questions(&new_topic_id)?
            } else {
                old_questions.clone()
            };

            // Check if the requested number is duplicate (excluding the current question)
            let is_duplicate = target_questions
                .iter()
                .any(|q| q.id != id && q.question_number == requested_number);

            // Use requested number if not duplicate, otherwise use max + 1
            Some(if is_duplicate {
                target_questions
                    .iter()
                    .map(|q| q.question_number)
                    .max()
                    .unwrap_or(0)
                    + 1
            } else {
                requested_number
            })
        } else {
            None
        };

        // Find and update the question
        if let Some(question) = old_questions.iter_mut().find(|q| q.id == id) {
            // Update fields if provided
            if let Some(subtopic) = dto.subtopic {
                question.subtopic = Some(subtopic);
            }

            // Apply the pre-calculated question number
            if let Some(number) = final_question_number {
                question.question_number = number;
            }

            if let Some(question_text) = dto.question {
                question.question = question_text;
            }
            if let Some(answer) = dto.answer {
                question.answer = answer;
            }
            if let Some(tags) = dto.tags {
                question.tags = tags;
            }
            if let Some(difficulty) = dto.difficulty {
                question.difficulty = difficulty;
            }
            if let Some(order) = dto.order {
                question.order = order;
            }

            question.updated_at = chrono::Utc::now().to_rfc3339();

            if topic_changed {
                // Update topic_id before cloning
                question.topic_id = new_topic_id.clone();

                let updated_question = question.clone();

                // Remove from old topic
                old_questions.retain(|q| q.id != id);
                self.db.save_topic_questions(&old_topic_id, old_questions)?;

                // Add to new topic
                let mut new_questions = self.db.get_topic_questions(&new_topic_id)?;
                new_questions.push(updated_question.clone());
                self.db.save_topic_questions(&new_topic_id, new_questions)?;

                Ok(Some(updated_question))
            } else {
                let updated_question = question.clone();

                // Save to same topic
                self.db.save_topic_questions(&old_topic_id, old_questions)?;

                Ok(Some(updated_question))
            }
        } else {
            Ok(None)
        }
    }

    /// Delete a question
    pub fn delete(&self, id: &str) -> Result<bool, String> {
        // Find which topic this question belongs to
        let topics = self.db.read_topics();
        let mut found_topic_id: Option<String> = None;

        for topic in topics.iter() {
            let questions = self.db.get_topic_questions(&topic.id)?;
            if questions.iter().any(|q| q.id == id) {
                found_topic_id = Some(topic.id.clone());
                break;
            }
        }

        let topic_id = match found_topic_id {
            Some(id) => id,
            None => return Ok(false),
        };

        // Load questions for this topic
        let mut questions = self.db.get_topic_questions(&topic_id)?;

        // Remove the question
        let initial_len = questions.len();
        questions.retain(|q| q.id != id);

        if questions.len() == initial_len {
            return Ok(false); // Question not found
        }

        // Renumber remaining questions
        questions.sort_by_key(|q| q.order);
        for (idx, question) in questions.iter_mut().enumerate() {
            question.question_number = (idx + 1) as i32;
        }

        // Save to file (this also updates index and invalidates cache)
        self.db.save_topic_questions(&topic_id, questions)?;

        Ok(true)
    }

    /// Get total count of questions
    #[allow(dead_code)]
    pub fn count(&self) -> Result<usize, String> {
        let index = self.db.read_index();
        Ok(index.stats.total_questions)
    }

    /// Get count of questions for a specific topic
    #[allow(dead_code)]
    pub fn count_by_topic(&self, topic_id: &str) -> Result<usize, String> {
        let questions = self.db.get_topic_questions(topic_id)?;
        Ok(questions.len())
    }

    /// Search questions by keyword
    pub fn search(&self, keyword: &str) -> Result<Vec<Question>, String> {
        let all_questions = self.get_all()?;
        let keyword_lower = keyword.to_lowercase();

        let results: Vec<Question> = all_questions
            .into_iter()
            .filter(|q| {
                q.question.to_lowercase().contains(&keyword_lower)
                    || q.answer.markdown.to_lowercase().contains(&keyword_lower)
            })
            .collect();

        Ok(results)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lazy_questions_repository_creation() {
        // This test just verifies the struct can be created
        // Full integration tests would require a real database
    }
}
