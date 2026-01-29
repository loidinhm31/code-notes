use chrono::{DateTime, Utc};
use rusqlite::{params, Connection};
use std::sync::{Arc, Mutex};

use crate::database::{
    models::{ProgressStatistics, ProgressStatus, QuestionProgress, UpdateProgressDto},
    LazyDatabase,
};

pub struct ProgressRepository {
    db: Arc<LazyDatabase>,
}

impl ProgressRepository {
    pub fn new(db: Arc<LazyDatabase>) -> Self {
        Self { db }
    }

    fn query_progress(
        &self,
        sql: &str,
        params: impl rusqlite::Params,
    ) -> Result<Vec<QuestionProgress>, String> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params, |row| {
                let status_str: String = row.get(2)?;
                // Parse status enum manually or serde?
                // Assuming stored as string "NotStudied" etc.
                let status = match status_str.as_str() {
                    "NotStudied" => ProgressStatus::NotStudied,
                    "Studying" => ProgressStatus::Studying,
                    "Mastered" => ProgressStatus::Mastered,
                    "NeedsReview" => ProgressStatus::NeedsReview,
                    _ => ProgressStatus::NotStudied,
                };

                Ok(QuestionProgress {
                    question_id: row.get(0)?,
                    topic_id: row.get(1)?,
                    status,
                    confidence_level: row.get(3)?,
                    times_reviewed: row.get(4)?,
                    times_correct: row.get(5)?,
                    times_incorrect: row.get(6)?,
                    last_reviewed_at: row.get(7)?,
                    next_review_at: row.get(8)?,
                    created_at: row.get(9)?,
                    updated_at: row.get(10)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut progress = Vec::new();
        for p in rows {
            progress.push(p.map_err(|e| e.to_string())?);
        }
        Ok(progress)
    }

    pub fn get_all(&self) -> Result<Vec<QuestionProgress>, String> {
        self.query_progress("SELECT * FROM progress", params![])
    }

    pub fn get_by_question_id(
        &self,
        question_id: &str,
    ) -> Result<Option<QuestionProgress>, String> {
        let res = self.query_progress(
            "SELECT * FROM progress WHERE question_id = ?",
            params![question_id],
        )?;
        Ok(res.into_iter().next())
    }

    pub fn get_by_topic(&self, topic_id: &str) -> Result<Vec<QuestionProgress>, String> {
        self.query_progress(
            "SELECT * FROM progress WHERE topic_id = ?",
            params![topic_id],
        )
    }

    pub fn update(
        &self,
        question_id: &str,
        dto: UpdateProgressDto,
    ) -> Result<QuestionProgress, String> {
        // Fetch existing or create default
        let existing = self.get_by_question_id(question_id)?;

        let mut current = if let Some(p) = existing {
            p
        } else {
            // Find topic_id for this question
            let conn = self.db.get_connection();
            let conn = conn.lock().unwrap();
            let topic_id: String = conn
                .query_row(
                    "SELECT topic_id FROM questions WHERE id = ?",
                    params![question_id],
                    |r| r.get(0),
                )
                .map_err(|_| format!("Question {} not found", question_id))?;
            drop(conn); // Drop lock

            QuestionProgress::new(question_id.to_string(), topic_id)
        };

        let now = Utc::now().to_rfc3339();

        if let Some(status) = dto.status {
            current.status = status;
        }
        if let Some(confidence) = dto.confidence_level {
            current.confidence_level = confidence.clamp(0, 5);
        }
        if let Some(was_correct) = dto.was_correct {
            current.times_reviewed += 1;
            if was_correct {
                current.times_correct += 1;
            } else {
                current.times_incorrect += 1;
            }
        }

        current.last_reviewed_at = Some(now.clone());
        current.updated_at = now.clone();

        current.next_review_at = Some(Self::calculate_next_review(
            current.confidence_level,
            current.times_reviewed,
        ));

        // Save
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        // Convert status enum to string
        let status_str = format!("{:?}", current.status); // Assuming Debug impl gives "NotStudied"

        // Using INSERT OR REPLACE to handle both creation and update
        conn.execute(
            "INSERT OR REPLACE INTO progress (
               question_id, topic_id, status, confidence_level, times_reviewed, times_correct, times_incorrect, last_reviewed_at, next_review_at, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                current.question_id,
                current.topic_id,
                status_str,
                current.confidence_level,
                current.times_reviewed,
                current.times_correct,
                current.times_incorrect,
                current.last_reviewed_at,
                current.next_review_at,
                current.created_at,
                current.updated_at
            ]
        ).map_err(|e| e.to_string())?;

        Ok(current)
    }

    pub fn reset(&self, question_id: &str) -> Result<bool, String> {
        // Just delete or update? original impl updated.
        let existing = self.get_by_question_id(question_id)?;
        if existing.is_none() {
            return Err(format!("Progress not found for {}", question_id));
        }
        let mut current = existing.unwrap();

        let now = Utc::now().to_rfc3339();
        current.status = ProgressStatus::NotStudied;
        current.confidence_level = 0;
        current.times_reviewed = 0;
        current.times_correct = 0;
        current.times_incorrect = 0;
        current.last_reviewed_at = None;
        current.next_review_at = None;
        current.updated_at = now;

        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        let status_str = format!("{:?}", current.status);

        conn.execute(
            "UPDATE progress SET status=?, confidence_level=?, times_reviewed=?, times_correct=?, times_incorrect=?, last_reviewed_at=?, next_review_at=?, updated_at=? WHERE question_id=?",
            params![status_str, 0, 0, 0, 0, Option::<String>::None, Option::<String>::None, current.updated_at, question_id]
        ).map_err(|e| e.to_string())?;

        Ok(true)
    }

    pub fn get_statistics(&self) -> Result<ProgressStatistics, String> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        // We can do this with SQL count queries or fetch all.
        // Fetching all is simpler to match original logic precisely (avg calculation etc)
        // But for performance, SQL is better.
        // Given SQLite wrapper constraint and this is "Refactor", let's be robust and just fetch all for now,
        // OR write multiple count queries.

        // Let's reuse get_all logic but optimize if needed.
        // Original logic fetched specific structs.
        drop(conn);

        let all = self.get_all()?;
        let total_questions = all.len();

        let not_studied = all
            .iter()
            .filter(|p| matches!(p.status, ProgressStatus::NotStudied))
            .count();
        let studying = all
            .iter()
            .filter(|p| matches!(p.status, ProgressStatus::Studying))
            .count();
        let mastered = all
            .iter()
            .filter(|p| matches!(p.status, ProgressStatus::Mastered))
            .count();
        let needs_review = all
            .iter()
            .filter(|p| matches!(p.status, ProgressStatus::NeedsReview))
            .count();

        let reviewed: Vec<&QuestionProgress> =
            all.iter().filter(|p| p.times_reviewed > 0).collect();
        let average_confidence = if reviewed.is_empty() {
            0.0
        } else {
            reviewed.iter().map(|p| p.confidence_level).sum::<i32>() as f32 / reviewed.len() as f32
        };

        let today = Utc::now().date_naive();
        let questions_reviewed_today = all
            .iter()
            .filter(|p| {
                if let Some(d) = &p.last_reviewed_at {
                    DateTime::parse_from_rfc3339(d)
                        .ok()
                        .map(|dt| dt.date_naive() == today)
                        .unwrap_or(false)
                } else {
                    false
                }
            })
            .count();

        let now = Utc::now();
        let questions_due_for_review = all
            .iter()
            .filter(|p| {
                if let Some(d) = &p.next_review_at {
                    DateTime::parse_from_rfc3339(d)
                        .ok()
                        .map(|dt| dt <= now)
                        .unwrap_or(false)
                } else {
                    false
                }
            })
            .count();

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

    // Duplicate of get_questions_due_for_review from original?
    pub fn get_questions_due_for_review(&self) -> Result<Vec<QuestionProgress>, String> {
        let all = self.get_all()?;
        let now = Utc::now();
        Ok(all
            .into_iter()
            .filter(|p| {
                if let Some(d) = &p.next_review_at {
                    DateTime::parse_from_rfc3339(d)
                        .ok()
                        .map(|dt| dt <= now)
                        .unwrap_or(false)
                } else {
                    false
                }
            })
            .collect())
    }

    fn calculate_next_review(confidence: i32, times_reviewed: i32) -> String {
        let days = match (confidence, times_reviewed) {
            (0..=1, _) => 1,
            (2..=3, 0..=2) => 3,
            (2..=3, _) => 7,
            (4..=5, 0..=2) => 14,
            (4..=5, _) => 30,
            _ => 7,
        };
        let next = Utc::now() + chrono::Duration::days(days);
        next.to_rfc3339()
    }

    pub fn ensure_progress_for_all_questions(&self) -> Result<usize, String> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        // Find questions that don't have progress
        let sql = "SELECT q.id, q.topic_id FROM questions q LEFT JOIN progress p ON q.id = p.question_id WHERE p.question_id IS NULL";
        let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|e| e.to_string())?;

        let missing: Vec<(String, String)> = rows.map(|r| r.unwrap()).collect();
        let count = missing.len();

        if count > 0 {
            let now = Utc::now().to_rfc3339();
            // Prepare batch insert?
            for (qid, tid) in missing {
                conn.execute(
                     "INSERT INTO progress (question_id, topic_id, status, confidence_level, times_reviewed, times_correct, times_incorrect, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                     params![qid, tid, "NotStudied", 0, 0, 0, 0, now, now]
                 ).map_err(|e| e.to_string())?;
            }
        }

        Ok(count)
    }
}
