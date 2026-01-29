use crate::database::models::{
    generate_id, Answer, CreateQuestionDto, Question, UpdateQuestionDto,
};
use crate::database::LazyDatabase;
use rusqlite::Connection;
use rusqlite::{params, OptionalExtension};
use std::sync::{Arc, Mutex};

pub struct LazyQuestionsRepository {
    db: Arc<LazyDatabase>,
}

impl LazyQuestionsRepository {
    pub fn new(db: Arc<LazyDatabase>) -> Self {
        Self { db }
    }

    pub fn get_all(&self) -> Result<Vec<Question>, String> {
        self.query_questions(
            "SELECT * FROM questions ORDER BY topic_id, order_index",
            params![],
        )
    }

    pub fn get_by_id(&self, id: &str) -> Result<Option<Question>, String> {
        let questions =
            self.query_questions("SELECT * FROM questions WHERE id = ?", params![id])?;
        Ok(questions.into_iter().next())
    }

    pub fn get_by_topic_id(&self, topic_id: &str) -> Result<Vec<Question>, String> {
        self.query_questions(
            "SELECT * FROM questions WHERE topic_id = ? ORDER BY order_index",
            params![topic_id],
        )
    }

    fn query_questions(
        &self,
        sql: &str,
        params: impl rusqlite::Params,
    ) -> Result<Vec<Question>, String> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map(params, |row| {
                let answer_json: String = row.get(5)?;
                let answer: Answer = serde_json::from_str(&answer_json).unwrap_or(Answer {
                    markdown: "".to_string(),
                });

                let tags_json: Option<String> = row.get(6)?;
                let tags: Vec<String> = if let Some(json) = tags_json {
                    serde_json::from_str(&json).unwrap_or_default()
                } else {
                    Vec::new()
                };

                Ok(Question {
                    id: row.get(0)?,
                    topic_id: row.get(1)?,
                    subtopic: row.get(2)?,
                    question_number: row.get(3)?,
                    question: row.get(4)?,
                    answer,
                    tags,
                    difficulty: row.get(7)?,
                    order: row.get(8)?,
                    created_at: row.get(9)?,
                    updated_at: row.get(10)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut questions = Vec::new();
        for q in rows {
            questions.push(q.map_err(|e| e.to_string())?);
        }
        Ok(questions)
    }

    pub fn create(&self, dto: CreateQuestionDto) -> Result<Question, String> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        // Check if topic exists
        let topic_count: i64 = conn
            .query_row(
                "SELECT count(*) FROM topics WHERE id = ?",
                params![dto.topic_id],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        if topic_count == 0 {
            return Err(format!("Topic with id {} not found", dto.topic_id));
        }

        // Calculate question number if duplicate or auto?
        // Original logic: "Use requested number if not duplicate, otherwise use max + 1"
        // Let's replicate this.
        let count_with_num: i64 = conn
            .query_row(
                "SELECT count(*) FROM questions WHERE topic_id = ? AND question_number = ?",
                params![dto.topic_id, dto.question_number],
                |row| row.get(0),
            )
            .unwrap_or(0);

        let question_number = if count_with_num > 0 {
            let max_num: Option<i32> = conn
                .query_row(
                    "SELECT MAX(question_number) FROM questions WHERE topic_id = ?",
                    params![dto.topic_id],
                    |row| row.get(0),
                )
                .unwrap_or(None);
            max_num.unwrap_or(0) + 1
        } else {
            dto.question_number
        };

        let id = generate_id();
        let now = chrono::Utc::now().to_rfc3339();
        let answer_json = serde_json::to_string(&dto.answer).unwrap_or("{}".to_string());
        let tags_json = serde_json::to_string(&dto.tags).unwrap_or("[]".to_string());

        conn.execute(
            "INSERT INTO questions (
                id, topic_id, subtopic, question_number, question, answer, tags, difficulty, order_index, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                id,
                dto.topic_id,
                dto.subtopic,
                question_number,
                dto.question,
                answer_json,
                tags_json,
                dto.difficulty,
                dto.order,
                now,
                now
            ]
        ).map_err(|e| e.to_string())?;

        Ok(Question {
            id,
            topic_id: dto.topic_id,
            subtopic: dto.subtopic,
            question_number,
            question: dto.question,
            answer: dto.answer,
            tags: dto.tags,
            difficulty: dto.difficulty,
            order: dto.order,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn update(&self, id: &str, dto: UpdateQuestionDto) -> Result<Option<Question>, String> {
        // Since logic is complex (re-numbering, moving topics), let's implementation minimal robust version.
        // Full replication of logic:

        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        // Get current
        let mut stmt = conn
            .prepare("SELECT * FROM questions WHERE id = ?")
            .map_err(|e| e.to_string())?;

        // Manual mapping again? Or helper?
        // Let's just fetch fields needed.
        let exists = stmt.exists(params![id]).unwrap_or(false);
        if !exists {
            return Ok(None);
        }

        drop(stmt);
        drop(conn); // Drop lock to use self methods or re-acquire

        // Fetch current question full object
        let current_opts = self.get_by_id(id)?;
        if current_opts.is_none() {
            return Ok(None);
        }
        let current = current_opts.unwrap();

        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        let now = chrono::Utc::now().to_rfc3339();

        let new_topic_id = dto.topic_id.clone().unwrap_or(current.topic_id.clone());
        let topic_changed = new_topic_id != current.topic_id;

        // Check target topic exists
        if topic_changed {
            let topic_exists: i64 = conn
                .query_row(
                    "SELECT count(*) FROM topics WHERE id = ?",
                    params![new_topic_id],
                    |row| row.get(0),
                )
                .unwrap_or(0);
            if topic_exists == 0 {
                return Err(format!("Topic {} not found", new_topic_id));
            }
        }

        // Calculate question number logic
        let mut final_question_number = current.question_number;

        if let Some(req_num) = dto.question_number {
            // If topic changed or num changed, check duplicate in TARGET topic
            let check_duplicate = topic_changed || req_num != current.question_number;

            if check_duplicate {
                let count: i64 = conn.query_row(
                    "SELECT count(*) FROM questions WHERE topic_id = ? AND question_number = ? AND id != ?",
                    params![new_topic_id, req_num, id],
                    |row| row.get(0)
                ).unwrap_or(0);

                if count > 0 {
                    let max: Option<i32> = conn
                        .query_row(
                            "SELECT MAX(question_number) FROM questions WHERE topic_id = ?",
                            params![new_topic_id],
                            |row| row.get(0),
                        )
                        .unwrap_or(None);
                    final_question_number = max.unwrap_or(0) + 1;
                } else {
                    final_question_number = req_num;
                }
            }
        }

        // Construct Update
        // "answer" and "tags" need JSON
        let answer_json = if let Some(a) = &dto.answer {
            Some(serde_json::to_string(a).unwrap_or("{}".to_string()))
        } else {
            None
        };
        let tags_json = if let Some(t) = &dto.tags {
            Some(serde_json::to_string(t).unwrap_or("[]".to_string()))
        } else {
            None
        };

        let mut set_clauses = vec!["updated_at = ?".to_string()];
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(now.clone())];

        if let Some(tid) = &dto.topic_id {
            set_clauses.push("topic_id = ?".to_string());
            params_vec.push(Box::new(tid.clone()));
        }
        if let Some(sub) = &dto.subtopic {
            set_clauses.push("subtopic = ?".to_string());
            params_vec.push(Box::new(sub.clone()));
        }

        // Always set number if it might have changed due to logic
        if final_question_number != current.question_number {
            set_clauses.push("question_number = ?".to_string());
            params_vec.push(Box::new(final_question_number));
        }

        if let Some(q) = &dto.question {
            set_clauses.push("question = ?".to_string());
            params_vec.push(Box::new(q.clone()));
        }
        if let Some(aj) = answer_json {
            set_clauses.push("answer = ?".to_string());
            params_vec.push(Box::new(aj));
        }
        if let Some(tj) = tags_json {
            set_clauses.push("tags = ?".to_string());
            params_vec.push(Box::new(tj));
        }
        if let Some(diff) = &dto.difficulty {
            set_clauses.push("difficulty = ?".to_string());
            params_vec.push(Box::new(diff.clone()));
        }
        if let Some(ord) = dto.order {
            set_clauses.push("order_index = ?".to_string());
            params_vec.push(Box::new(ord));
        }

        params_vec.push(Box::new(id.to_string()));

        let sql = format!(
            "UPDATE questions SET {} WHERE id = ?",
            set_clauses.join(", ")
        );

        let params_refs: Vec<&dyn rusqlite::ToSql> =
            params_vec.iter().map(|b| b.as_ref()).collect();
        conn.execute(&sql, rusqlite::params_from_iter(params_refs))
            .map_err(|e| e.to_string())?;

        drop(conn);

        self.get_by_id(id)
    }

    pub fn delete(&self, id: &str) -> Result<bool, String> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        let count = conn
            .execute("DELETE FROM questions WHERE id = ?", params![id])
            .map_err(|e| e.to_string())?;
        Ok(count > 0)
    }

    pub fn count(&self) -> Result<usize, String> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();
        let count: i64 = conn
            .query_row("SELECT count(*) FROM questions", [], |r| r.get(0))
            .map_err(|e| e.to_string())?;
        Ok(count as usize)
    }

    pub fn count_by_topic(&self, topic_id: &str) -> Result<usize, String> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();
        let count: i64 = conn
            .query_row(
                "SELECT count(*) FROM questions WHERE topic_id = ?",
                params![topic_id],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;
        Ok(count as usize)
    }

    pub fn search(&self, keyword: &str) -> Result<Vec<Question>, String> {
        let keyword_param = format!("%{}%", keyword);
        // SQLite doesn't have easy JSON search, so we check question text and maybe answer text (which is JSON string)
        // Or if answer is markdown inside JSON, simple LIKE works on the JSON string too.
        self.query_questions(
            "SELECT * FROM questions WHERE question LIKE ? OR answer LIKE ?",
            params![keyword_param, keyword_param],
        )
    }
}
