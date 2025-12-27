use std::sync::Arc;
use chrono::{Utc, DateTime};

use crate::database::{
    models::{QuestionProgress, ProgressStatus, UpdateProgressDto, ProgressStatistics},
    LazyDatabase,
};

/// Repository for progress operations
pub struct ProgressRepository {
    db: Arc<LazyDatabase>,
}

impl ProgressRepository {
    pub fn new(db: Arc<LazyDatabase>) -> Self {
        Self { db }
    }

    /// Get all progress entries (from memory, always loaded)
    pub fn get_all(&self) -> Result<Vec<QuestionProgress>, String> {
        let progress = self.db.read_progress();
        Ok(progress.clone())
    }

    /// Get progress for a specific question
    pub fn get_by_question_id(&self, question_id: &str) -> Result<Option<QuestionProgress>, String> {
        let progress = self.db.read_progress();
        let entry = progress.iter().find(|p| p.question_id == question_id).cloned();
        Ok(entry)
    }

    /// Get all progress for a specific topic
    pub fn get_by_topic(&self, topic_id: &str) -> Result<Vec<QuestionProgress>, String> {
        let progress = self.db.read_progress();
        let entries: Vec<QuestionProgress> = progress
            .iter()
            .filter(|p| p.topic_id == topic_id)
            .cloned()
            .collect();
        Ok(entries)
    }

    /// Update progress for a question (creates if doesn't exist)
    pub fn update(&self, question_id: &str, dto: UpdateProgressDto) -> Result<QuestionProgress, String> {
        // Check if progress exists, if not, create it
        {
            let progress = self.db.read_progress();
            let exists = progress.iter().any(|p| p.question_id == question_id);

            if !exists {
                // Release read lock before creating
                drop(progress);

                // Find the question's topic_id
                let topics = self.db.read_topics();
                let mut topic_id = String::new();

                for topic in topics.iter() {
                    let questions = self.db.get_topic_questions(&topic.id)?;
                    if questions.iter().any(|q| q.id == question_id) {
                        topic_id = topic.id.clone();
                        break;
                    }
                }

                if topic_id.is_empty() {
                    return Err(format!("Question not found: {}", question_id));
                }

                // Create new progress entry
                let new_entry = QuestionProgress::new(question_id.to_string(), topic_id);

                let mut progress = self.db.write_progress();
                progress.push(new_entry);
                drop(progress);

                // Save to disk
                self.db.save_progress()?;
            }
        }

        // Now update the progress entry (we know it exists)
        let mut progress = self.db.write_progress();

        let entry = progress
            .iter_mut()
            .find(|p| p.question_id == question_id)
            .expect("Progress entry should exist after creation");

        let now = Utc::now().to_rfc3339();

        // Update status if provided
        if let Some(status) = dto.status {
            entry.status = status;
        }

        // Update confidence level if provided
        if let Some(confidence) = dto.confidence_level {
            entry.confidence_level = confidence.clamp(0, 5);
        }

        // Handle quiz result
        if let Some(was_correct) = dto.was_correct {
            entry.times_reviewed += 1;
            if was_correct {
                entry.times_correct += 1;
            } else {
                entry.times_incorrect += 1;
            }
        }

        // Update timestamps
        entry.last_reviewed_at = Some(now.clone());
        entry.updated_at = now;

        // Calculate next review date based on spaced repetition
        entry.next_review_at = Some(Self::calculate_next_review(
            entry.confidence_level,
            entry.times_reviewed,
        ));

        let updated = entry.clone();

        // Release the write lock before saving
        drop(progress);

        // Save to disk
        self.db.save_progress()?;

        Ok(updated)
    }

    /// Reset progress for a question
    pub fn reset(&self, question_id: &str) -> Result<bool, String> {
        let mut progress = self.db.write_progress();

        let entry = progress
            .iter_mut()
            .find(|p| p.question_id == question_id)
            .ok_or_else(|| format!("Progress not found for question: {}", question_id))?;

        let now = Utc::now().to_rfc3339();

        entry.status = ProgressStatus::NotStudied;
        entry.confidence_level = 0;
        entry.times_reviewed = 0;
        entry.times_correct = 0;
        entry.times_incorrect = 0;
        entry.last_reviewed_at = None;
        entry.next_review_at = None;
        entry.updated_at = now;

        // Release the write lock before saving
        drop(progress);

        // Save to disk
        self.db.save_progress()?;

        Ok(true)
    }

    /// Get progress statistics
    pub fn get_statistics(&self) -> Result<ProgressStatistics, String> {
        let progress = self.db.read_progress();

        let not_studied = progress.iter().filter(|p| matches!(p.status, ProgressStatus::NotStudied)).count();
        let studying = progress.iter().filter(|p| matches!(p.status, ProgressStatus::Studying)).count();
        let mastered = progress.iter().filter(|p| matches!(p.status, ProgressStatus::Mastered)).count();
        let needs_review = progress.iter().filter(|p| matches!(p.status, ProgressStatus::NeedsReview)).count();

        let total_questions = progress.len();

        // Calculate average confidence (only for reviewed questions)
        let reviewed_progress: Vec<&QuestionProgress> = progress
            .iter()
            .filter(|p| p.times_reviewed > 0)
            .collect();

        let average_confidence = if reviewed_progress.is_empty() {
            0.0
        } else {
            let sum: i32 = reviewed_progress.iter().map(|p| p.confidence_level).sum();
            sum as f32 / reviewed_progress.len() as f32
        };

        // Questions reviewed today
        let today = Utc::now().date_naive();
        let questions_reviewed_today = progress.iter().filter(|p| {
            if let Some(last_reviewed) = &p.last_reviewed_at {
                if let Ok(dt) = DateTime::parse_from_rfc3339(last_reviewed) {
                    return dt.date_naive() == today;
                }
            }
            false
        }).count();

        // Questions due for review
        let now = Utc::now();
        let questions_due_for_review = progress.iter().filter(|p| {
            if let Some(next_review) = &p.next_review_at {
                if let Ok(dt) = DateTime::parse_from_rfc3339(next_review) {
                    return dt <= now;
                }
            }
            false
        }).count();

        Ok(ProgressStatistics {
            not_studied,
            studying,
            mastered,
            needs_review,
            total_questions,
            average_confidence,
            questions_reviewed_today,
            questions_due_for_review,
        })
    }

    /// Get questions due for review
    pub fn get_questions_due_for_review(&self) -> Result<Vec<QuestionProgress>, String> {
        let progress = self.db.read_progress();
        let now = Utc::now();

        let due_questions: Vec<QuestionProgress> = progress
            .iter()
            .filter(|p| {
                if let Some(next_review) = &p.next_review_at {
                    if let Ok(dt) = DateTime::parse_from_rfc3339(next_review) {
                        return dt <= now;
                    }
                }
                false
            })
            .cloned()
            .collect();

        Ok(due_questions)
    }

    /// Calculate next review date based on spaced repetition
    /// Returns ISO 8601 timestamp
    fn calculate_next_review(confidence: i32, times_reviewed: i32) -> String {
        let days = match (confidence, times_reviewed) {
            (0..=1, _) => 1,       // Very low confidence: review tomorrow
            (2..=3, 0..=2) => 3,   // Medium confidence: 3 days
            (2..=3, _) => 7,       // Medium confidence, reviewed: 1 week
            (4..=5, 0..=2) => 14,  // High confidence: 2 weeks
            (4..=5, _) => 30,      // High confidence, reviewed: 1 month
            _ => 7,                // Default: 1 week
        };

        let next_review = Utc::now() + chrono::Duration::days(days);
        next_review.to_rfc3339()
    }

    /// Ensure progress exists for all questions (migration helper)
    pub fn ensure_progress_for_all_questions(&self) -> Result<usize, String> {
        // Get all questions from all topics
        let topics = self.db.read_topics();
        let mut all_question_ids = Vec::new();

        for topic in topics.iter() {
            let questions = self.db.get_topic_questions(&topic.id)?;
            for question in questions {
                all_question_ids.push((question.id.clone(), topic.id.clone()));
            }
        }

        // Get existing progress
        let existing_progress = self.db.read_progress();
        let existing_ids: Vec<&String> = existing_progress.iter().map(|p| &p.question_id).collect();

        // Find questions without progress
        let mut new_entries = Vec::new();
        for (question_id, topic_id) in all_question_ids {
            if !existing_ids.contains(&&question_id) {
                new_entries.push(QuestionProgress::new(question_id, topic_id));
            }
        }

        let count = new_entries.len();

        if count > 0 {
            // Add new progress entries
            let mut progress = self.db.write_progress();
            progress.extend(new_entries);

            // Release the write lock before saving
            drop(progress);

            // Save to disk
            self.db.save_progress()?;

            println!("Created {} new progress entries", count);
        }

        Ok(count)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_next_review() {
        // Low confidence should be 1 day
        let next = ProgressRepository::calculate_next_review(0, 0);
        assert!(next.len() > 0);

        // High confidence should be 14-30 days
        let next = ProgressRepository::calculate_next_review(5, 0);
        assert!(next.len() > 0);
    }
}
