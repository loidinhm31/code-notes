use chrono::Utc;
use rand::seq::SliceRandom;
use rusqlite::{params, Connection};
use std::sync::{Arc, Mutex};

use crate::database::{
    models::{CreateQuizSessionDto, QuizResult, QuizSession, QuizSessionType},
    LazyDatabase,
};

pub struct QuizSessionRepository {
    db: Arc<LazyDatabase>,
}

impl QuizSessionRepository {
    pub fn new(db: Arc<LazyDatabase>) -> Self {
        Self { db }
    }

    fn query_sessions(
        &self,
        sql: &str,
        params: impl rusqlite::Params,
    ) -> Result<Vec<QuizSession>, String> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params, |row| {
                let topic_ids_json: Option<String> = row.get(2)?;
                let question_ids_json: Option<String> = row.get(3)?;
                let results_json: Option<String> = row.get(7)?;

                let topic_ids = topic_ids_json
                    .and_then(|j| serde_json::from_str(&j).ok())
                    .unwrap_or_default();
                let question_ids = question_ids_json
                    .and_then(|j| serde_json::from_str(&j).ok())
                    .unwrap_or_default();
                let results = results_json
                    .and_then(|j| serde_json::from_str(&j).ok())
                    .unwrap_or_default();

                let type_str: String = row.get(1)?;
                let session_type = serde_json::from_str(&format!("\"{}\"", type_str))
                    .unwrap_or(QuizSessionType::Random); // Hacky enum parsing or simple string match

                Ok(QuizSession {
                    id: row.get(0)?,
                    session_type,
                    topic_ids,
                    question_ids,
                    current_index: row.get(4)?,
                    started_at: row.get(5)?,
                    completed_at: row.get(6)?,
                    results,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut sessions = Vec::new();
        for s in rows {
            sessions.push(s.map_err(|e| e.to_string())?);
        }
        Ok(sessions)
    }

    pub fn create(&self, dto: CreateQuizSessionDto) -> Result<QuizSession, String> {
        // reuse selection logic which uses other repos...
        // Wait, other repos queries need to be accessible.
        // `select_questions` calls `self.db.read_topics()` which we removed.
        // We need to query DB directly here too.

        let question_ids = self.select_questions(&dto)?;
        if question_ids.is_empty() {
            return Err("No questions available".to_string());
        }

        let topic_ids = dto.topic_ids.unwrap_or_default();

        let session = QuizSession::new(dto.session_type, topic_ids, question_ids);

        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        let topic_ids_json = serde_json::to_string(&session.topic_ids).unwrap();
        let question_ids_json = serde_json::to_string(&session.question_ids).unwrap();
        let results_json = serde_json::to_string(&session.results).unwrap();
        let type_str = format!("{:?}", session.session_type); // assuming Debug

        conn.execute(
            "INSERT INTO quiz_sessions (id, session_type, topic_ids, question_ids, current_index, started_at, completed_at, results) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            params![session.id, type_str, topic_ids_json, question_ids_json, session.current_index, session.started_at, session.completed_at, results_json]
        ).map_err(|e| e.to_string())?;

        Ok(session)
    }

    pub fn get_by_id(&self, id: &str) -> Result<Option<QuizSession>, String> {
        let sessions =
            self.query_sessions("SELECT * FROM quiz_sessions WHERE id = ?", params![id])?;
        Ok(sessions.into_iter().next())
    }

    pub fn get_active(&self) -> Result<Option<QuizSession>, String> {
        let sessions = self.query_sessions("SELECT * FROM quiz_sessions WHERE completed_at IS NULL ORDER BY started_at DESC LIMIT 1", params![])?;
        Ok(sessions.into_iter().next())
    }

    pub fn submit_result(
        &self,
        session_id: &str,
        result: QuizResult,
    ) -> Result<QuizSession, String> {
        let mut session = self.get_by_id(session_id)?.ok_or("Session not found")?;

        if session
            .results
            .iter()
            .any(|r| r.question_id == result.question_id)
        {
            return Err("Question already answered".to_string());
        }

        session.results.push(result);
        session.current_index = session.results.len() as i32;

        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        let results_json = serde_json::to_string(&session.results).unwrap();

        conn.execute(
            "UPDATE quiz_sessions SET results = ?, current_index = ? WHERE id = ?",
            params![results_json, session.current_index, session_id],
        )
        .map_err(|e| e.to_string())?;

        Ok(session)
    }

    pub fn complete(&self, session_id: &str) -> Result<QuizSession, String> {
        let mut session = self.get_by_id(session_id)?.ok_or("Session not found")?;
        if session.completed_at.is_some() {
            return Err("Already completed".to_string());
        }

        let now = Utc::now().to_rfc3339();
        session.completed_at = Some(now.clone());

        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();
        conn.execute(
            "UPDATE quiz_sessions SET completed_at = ? WHERE id = ?",
            params![now, session_id],
        )
        .map_err(|e| e.to_string())?;

        Ok(session)
    }

    pub fn get_history(&self, limit: Option<i32>) -> Result<Vec<QuizSession>, String> {
        let limit = limit.unwrap_or(10);
        self.query_sessions(
            &format!(
                "SELECT * FROM quiz_sessions ORDER BY started_at DESC LIMIT {}",
                limit
            ),
            params![],
        )
    }

    pub fn get_all_sessions(&self) -> Result<Vec<QuizSession>, String> {
        self.query_sessions("SELECT * FROM quiz_sessions", params![])
    }

    // Helper functions for question selection needing direct DB queries
    // replacing `collect_questions` which used `db.read_topics()`
    fn select_questions(&self, dto: &CreateQuizSessionDto) -> Result<Vec<String>, String> {
        // This logic is complex because it involves filtering and randomizing.
        // Let's implement a simpler version that pulls candidates from DB.

        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        // Build Query
        let mut sql = "SELECT q.id, q.order_index, p.status, p.id FROM questions q LEFT JOIN progress p ON q.id = p.question_id".to_string(); // p.id just to check existence

        // Filter by topics
        let mut where_clauses = Vec::new();
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new(); // Dyn params again...

        if let Some(ids) = &dto.topic_ids {
            if !ids.is_empty() {
                let placeholders: Vec<String> = ids.iter().map(|_| "?".to_string()).collect();
                where_clauses.push(format!("q.topic_id IN ({})", placeholders.join(",")));
                for id in ids {
                    params_vec.push(Box::new(id.clone()));
                }
            }
        }

        if let Some(diff) = &dto.difficulty {
            where_clauses.push("q.difficulty = ?".to_string());
            params_vec.push(Box::new(diff.clone()));
        }

        if !where_clauses.is_empty() {
            sql.push_str(" WHERE ");
            sql.push_str(&where_clauses.join(" AND "));
        }

        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let params_refs: Vec<&dyn rusqlite::ToSql> =
            params_vec.iter().map(|b| b.as_ref()).collect();

        struct Candidate {
            id: String,
            order: i32,
            status: String,
        }

        let rows = stmt
            .query_map(rusqlite::params_from_iter(params_refs), |row| {
                let status: Option<String> = row.get(2)?;
                Ok(Candidate {
                    id: row.get(0)?,
                    order: row.get(1)?,
                    status: status.unwrap_or("NotStudied".to_string()),
                })
            })
            .map_err(|e| e.to_string())?;

        let mut candidates = Vec::new();
        for r in rows {
            candidates.push(r.map_err(|e| e.to_string())?);
        }

        // drop(conn); // let it drop at end of scope

        // now apply strategy
        match dto.session_type {
            QuizSessionType::Random
            | QuizSessionType::TopicFocused
            | QuizSessionType::DifficultyFocused => {
                use rand::seq::SliceRandom;
                let mut rng = rand::thread_rng();
                candidates.shuffle(&mut rng);
            }
            QuizSessionType::Sequential => {
                candidates.sort_by_key(|c| c.order);
            }
            QuizSessionType::QuickRefresher => {
                // Filter mastered
                candidates.retain(|c| c.status == "Mastered");
                if candidates.is_empty() {
                    return Err("No mastered questions".to_string());
                }
                use rand::seq::SliceRandom;
                let mut rng = rand::thread_rng();
                candidates.shuffle(&mut rng);
            }
        }

        let max = dto.max_questions.unwrap_or(candidates.len() as i32) as usize;
        Ok(candidates.into_iter().take(max).map(|c| c.id).collect())
    }
}
