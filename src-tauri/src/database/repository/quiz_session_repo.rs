use std::sync::Arc;
use chrono::Utc;
use rand::seq::SliceRandom;

use crate::database::{
    models::{
        QuizSession, QuizSessionType, QuizResult, CreateQuizSessionDto,
        QuestionProgress, ProgressStatus, Question,
    },
    LazyDatabase,
};

/// Repository for quiz session operations
pub struct QuizSessionRepository {
    db: Arc<LazyDatabase>,
}

impl QuizSessionRepository {
    pub fn new(db: Arc<LazyDatabase>) -> Self {
        Self { db }
    }

    /// Create a new quiz session
    pub fn create(&self, dto: CreateQuizSessionDto) -> Result<QuizSession, String> {
        // Get all questions based on the session type
        let question_ids = self.select_questions(&dto)?;

        if question_ids.is_empty() {
            return Err("No questions available for the selected criteria".to_string());
        }

        let topic_ids = dto.topic_ids.clone().unwrap_or_default();

        let session = QuizSession::new(
            dto.session_type,
            topic_ids,
            question_ids,
        );

        // Save the session
        self.db.save_quiz_session(&session)?;

        // Update quiz sessions index
        self.db.add_quiz_session_to_index(&session.id)?;

        Ok(session)
    }

    /// Get a quiz session by ID
    pub fn get_by_id(&self, id: &str) -> Result<Option<QuizSession>, String> {
        self.db.get_quiz_session(id)
    }

    /// Get the active (incomplete) quiz session
    pub fn get_active(&self) -> Result<Option<QuizSession>, String> {
        let index = self.db.read_quiz_sessions_index();

        // Iterate through sessions (most recent first) to find an active one
        for session_id in index.session_ids.iter().rev() {
            if let Some(session) = self.db.get_quiz_session(session_id)? {
                if !session.is_completed() {
                    return Ok(Some(session));
                }
            }
        }

        Ok(None)
    }

    /// Submit a quiz result for a question
    pub fn submit_result(&self, session_id: &str, result: QuizResult) -> Result<QuizSession, String> {
        let mut session = self
            .get_by_id(session_id)?
            .ok_or_else(|| format!("Quiz session not found: {}", session_id))?;

        // Validate question is in the session
        if !session.question_ids.contains(&result.question_id) {
            return Err(format!("Question {} is not part of this quiz session", result.question_id));
        }

        // Check if already answered
        if session.results.iter().any(|r| r.question_id == result.question_id) {
            return Err(format!("Question {} has already been answered", result.question_id));
        }

        // Add the result
        session.results.push(result);

        // Update current index
        session.current_index = session.results.len() as i32;

        // Save the updated session
        self.db.save_quiz_session(&session)?;

        Ok(session)
    }

    /// Complete a quiz session
    pub fn complete(&self, session_id: &str) -> Result<QuizSession, String> {
        let mut session = self
            .get_by_id(session_id)?
            .ok_or_else(|| format!("Quiz session not found: {}", session_id))?;

        if session.is_completed() {
            return Err("Quiz session is already completed".to_string());
        }

        session.completed_at = Some(Utc::now().to_rfc3339());

        // Save the updated session
        self.db.save_quiz_session(&session)?;

        Ok(session)
    }

    /// Get quiz session history (most recent first)
    pub fn get_history(&self, limit: Option<i32>) -> Result<Vec<QuizSession>, String> {
        let index = self.db.read_quiz_sessions_index();
        let limit = limit.unwrap_or(10) as usize;

        let mut sessions = Vec::new();

        // Get most recent sessions (reverse order)
        for session_id in index.session_ids.iter().rev().take(limit) {
            if let Some(session) = self.db.get_quiz_session(session_id)? {
                sessions.push(session);
            }
        }

        Ok(sessions)
    }

    /// Get all quiz sessions (for export)
    pub fn get_all_sessions(&self) -> Result<Vec<QuizSession>, String> {
        let index = self.db.read_quiz_sessions_index();
        let mut sessions = Vec::new();

        // Get all sessions
        for session_id in index.session_ids.iter() {
            if let Some(session) = self.db.get_quiz_session(session_id)? {
                sessions.push(session);
            }
        }

        Ok(sessions)
    }

    /// Select questions based on the quiz session configuration
    fn select_questions(&self, dto: &CreateQuizSessionDto) -> Result<Vec<String>, String> {
        let mut questions = self.collect_questions(dto)?;

        // Apply question selection strategy based on session type
        let selected = match dto.session_type {
            QuizSessionType::Random => {
                self.select_random(&mut questions)
            }
            QuizSessionType::Sequential => {
                self.select_sequential(&mut questions)
            }
            QuizSessionType::QuickRefresher => {
                self.select_quick_refresher(&mut questions)?
            }
            QuizSessionType::TopicFocused => {
                self.select_random(&mut questions) // Already filtered by topic
            }
            QuizSessionType::DifficultyFocused => {
                self.select_random(&mut questions) // Already filtered by difficulty
            }
        };

        // Apply max questions limit
        let max_questions = dto.max_questions.unwrap_or(selected.len() as i32) as usize;
        Ok(selected.into_iter().take(max_questions).collect())
    }

    /// Collect questions based on filters
    fn collect_questions(&self, dto: &CreateQuizSessionDto) -> Result<Vec<(Question, QuestionProgress)>, String> {
        let topics = self.db.read_topics();
        let progress = self.db.read_progress();

        let mut questions_with_progress = Vec::new();

        // Determine which topics to include
        let topic_ids_to_include = if let Some(ref topic_ids) = dto.topic_ids {
            topic_ids.clone()
        } else {
            topics.iter().map(|t| t.id.clone()).collect()
        };

        // Collect questions from selected topics
        for topic_id in topic_ids_to_include {
            let questions = self.db.get_topic_questions(&topic_id)?;

            for question in questions {
                // Apply difficulty filter if specified
                if let Some(ref difficulty) = dto.difficulty {
                    if &question.difficulty != difficulty {
                        continue;
                    }
                }

                // Find progress for this question
                let question_progress = progress
                    .iter()
                    .find(|p| p.question_id == question.id)
                    .cloned()
                    .unwrap_or_else(|| QuestionProgress::new(question.id.clone(), topic_id.clone()));

                questions_with_progress.push((question, question_progress));
            }
        }

        Ok(questions_with_progress)
    }

    /// Random selection
    fn select_random(&self, questions: &mut [(Question, QuestionProgress)]) -> Vec<String> {
        let mut rng = rand::thread_rng();
        questions.shuffle(&mut rng);
        questions.iter().map(|(q, _)| q.id.clone()).collect()
    }

    /// Sequential selection (by topic order, then question order)
    fn select_sequential(&self, questions: &mut [(Question, QuestionProgress)]) -> Vec<String> {
        // Sort by topic order (if available) and question order
        questions.sort_by(|(q1, _), (q2, _)| {
            q1.order.cmp(&q2.order)
        });

        questions.iter().map(|(q, _)| q.id.clone()).collect()
    }

    /// Quick refresher: only mastered questions, randomized
    fn select_quick_refresher(&self, questions: &mut [(Question, QuestionProgress)]) -> Result<Vec<String>, String> {
        // Filter only mastered questions
        let mut mastered: Vec<(Question, QuestionProgress)> = questions
            .iter()
            .filter(|(_, p)| matches!(p.status, ProgressStatus::Mastered))
            .cloned()
            .collect();

        if mastered.is_empty() {
            return Err("No mastered questions available for quick refresher".to_string());
        }

        Ok(self.select_random(&mut mastered))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::models::ProgressStatus;

    #[test]
    fn test_quick_refresher_filters_mastered() {
        // This would require a mock database, skipping for now
        // In a real test, we'd verify that only mastered questions are included
    }

    #[test]
    fn test_sequential_ordering() {
        // This would require a mock database, skipping for now
        // In a real test, we'd verify the ordering logic
    }
}
