use std::sync::Arc;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use qm_sync_client::{Checkpoint, ReqwestHttpClient, QmSyncClient, SyncClientConfig, SyncRecord};

use crate::auth::AuthService;
use crate::database::LazyDatabase;

/// Sync service for synchronizing local data with qm-sync
#[derive(Clone)]
pub struct SyncService {
    db: Arc<LazyDatabase>,
    auth: Arc<std::sync::Mutex<AuthService>>,
}

/// Result of a sync operation
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SyncResult {
    pub pushed: usize,
    pub pulled: usize,
    pub conflicts: usize,
    pub success: bool,
    pub error: Option<String>,
    pub synced_at: i64,
}

/// Sync status
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatus {
    pub configured: bool,
    pub authenticated: bool,
    pub last_sync_at: Option<i64>,
    pub pending_changes: usize,
    pub server_url: Option<String>,
}

impl SyncService {
    pub fn new(
        db: Arc<LazyDatabase>,
        auth: Arc<std::sync::Mutex<AuthService>>,
    ) -> Self {
        Self { db, auth }
    }

    /// Get sync status
    pub async fn get_sync_status(
        &self,
        app_handle: &tauri::AppHandle,
    ) -> Result<SyncStatus, String> {
        let is_authenticated = {
            let auth = self.auth.lock().map_err(|e| format!("Failed to lock auth: {}", e))?.clone();
            auth.is_authenticated(app_handle).await
        };

        let last_sync_at = self.get_last_sync_timestamp()?;
        let pending_changes = self.count_pending_changes()?;
        let server_url = std::env::var("SYNC_SERVER_URL").ok();

        Ok(SyncStatus {
            configured: server_url.is_some(),
            authenticated: is_authenticated,
            last_sync_at,
            pending_changes,
            server_url,
        })
    }

    /// Main sync operation
    pub async fn sync_now(
        &self,
        app_handle: &tauri::AppHandle,
    ) -> Result<SyncResult, String> {
        let start_time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| format!("Time error: {}", e))?
            .as_secs() as i64;

        let (server_url, app_id, api_key, access_token, refresh_token) = {
            let auth = self.auth.lock().map_err(|e| format!("Failed to lock auth: {}", e))?.clone();
            let access_token = auth.get_access_token(app_handle).await?;
            let refresh_token = auth.get_refresh_token(app_handle).await?;
            let server_url = std::env::var("SYNC_SERVER_URL")
                .map_err(|_| "SYNC_SERVER_URL not configured")?;
            let app_id = self.get_app_id(app_handle).await?;
            let api_key = auth.get_stored_api_key(app_handle)?;
            (server_url, app_id, api_key, access_token, refresh_token)
        };

        let config = SyncClientConfig::new(&server_url, &app_id, &api_key);
        let http = ReqwestHttpClient::new();
        let client = QmSyncClient::new(config, http);

        client.set_tokens(access_token, refresh_token, None).await;

        let local_changes = self.collect_local_changes()?;
        let checkpoint = self.get_checkpoint()?;

        println!("Syncing {} local changes, checkpoint: {:?}", local_changes.len(), checkpoint);

        let response = client.delta(local_changes.clone(), checkpoint).await
            .map_err(|e| format!("Sync failed: {}", e))?;

        let mut pushed = 0;
        let mut conflicts = 0;
        let mut pulled = 0;

        if let Some(push) = &response.push {
            pushed = push.synced;
            conflicts = push.conflicts.len();
            self.mark_records_synced(&local_changes, start_time)?;
        }

        if let Some(pull) = &response.pull {
            pulled = pull.records.len();

            let sync_records: Vec<SyncRecord> = pull.records.iter().map(|r| SyncRecord {
                table_name: r.table_name.clone(),
                row_id: r.row_id.clone(),
                data: r.data.clone(),
                version: r.version,
                deleted: r.deleted,
            }).collect();

            self.apply_remote_changes(&sync_records)?;
            self.save_checkpoint(&pull.checkpoint)?;
        }

        Ok(SyncResult {
            pushed,
            pulled,
            conflicts,
            success: true,
            error: None,
            synced_at: start_time,
        })
    }

    /// Collect local changes since last sync
    fn collect_local_changes(&self) -> Result<Vec<SyncRecord>, String> {
        let mut records = Vec::new();
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        // Collect deleted topics
        {
            let mut stmt = conn.prepare(
                "SELECT id, sync_version FROM topics WHERE deleted = 1 AND synced_at IS NULL"
            ).map_err(|e| e.to_string())?;
            let rows = stmt.query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
            }).map_err(|e| e.to_string())?;
            for row in rows {
                let (id, version) = row.map_err(|e| e.to_string())?;
                records.push(SyncRecord {
                    table_name: "topics".to_string(),
                    row_id: id,
                    data: serde_json::json!({}),
                    version,
                    deleted: true,
                });
            }
        }

        // Collect unsynced active topics
        {
            let mut stmt = conn.prepare(
                "SELECT id, name, description, slug, icon, color, subtopics, order_index, created_at, updated_at, sync_version
                 FROM topics WHERE deleted = 0 AND synced_at IS NULL"
            ).map_err(|e| e.to_string())?;
            let rows = stmt.query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, Option<String>>(4)?,
                    row.get::<_, Option<String>>(5)?,
                    row.get::<_, Option<String>>(6)?,
                    row.get::<_, i32>(7)?,
                    row.get::<_, String>(8)?,
                    row.get::<_, String>(9)?,
                    row.get::<_, i64>(10)?,
                ))
            }).map_err(|e| e.to_string())?;
            for row in rows {
                let (id, name, description, slug, icon, color, subtopics, order_index, created_at, updated_at, sync_version) = row.map_err(|e| e.to_string())?;
                let mut data = serde_json::json!({
                    "name": name,
                    "description": description,
                    "slug": slug,
                    "icon": icon,
                    "color": color,
                    "subtopics": subtopics,
                    "orderIndex": order_index,
                    "createdAt": created_at,
                    "updatedAt": updated_at,
                });
                if let Some(obj) = data.as_object_mut() {
                    obj.retain(|_, v| !v.is_null());
                }
                records.push(SyncRecord {
                    table_name: "topics".to_string(),
                    row_id: id,
                    data,
                    version: sync_version,
                    deleted: false,
                });
            }
        }

        // Collect deleted questions
        {
            let mut stmt = conn.prepare(
                "SELECT id, sync_version FROM questions WHERE deleted = 1 AND synced_at IS NULL"
            ).map_err(|e| e.to_string())?;
            let rows = stmt.query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
            }).map_err(|e| e.to_string())?;
            for row in rows {
                let (id, version) = row.map_err(|e| e.to_string())?;
                records.push(SyncRecord {
                    table_name: "questions".to_string(),
                    row_id: id,
                    data: serde_json::json!({}),
                    version,
                    deleted: true,
                });
            }
        }

        // Collect unsynced active questions
        {
            let mut stmt = conn.prepare(
                "SELECT id, topic_id, subtopic, question_number, question, answer, tags, difficulty, order_index, created_at, updated_at, sync_version
                 FROM questions WHERE deleted = 0 AND synced_at IS NULL"
            ).map_err(|e| e.to_string())?;
            let rows = stmt.query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, i32>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, Option<String>>(6)?,
                    row.get::<_, Option<String>>(7)?,
                    row.get::<_, i32>(8)?,
                    row.get::<_, String>(9)?,
                    row.get::<_, String>(10)?,
                    row.get::<_, i64>(11)?,
                ))
            }).map_err(|e| e.to_string())?;
            for row in rows {
                let (id, topic_id, subtopic, question_number, question, answer, tags, difficulty, order_index, created_at, updated_at, sync_version) = row.map_err(|e| e.to_string())?;
                let mut data = serde_json::json!({
                    "topicSyncUuid": topic_id,
                    "subtopic": subtopic,
                    "questionNumber": question_number,
                    "question": question,
                    "answer": answer,
                    "tags": tags,
                    "difficulty": difficulty,
                    "orderIndex": order_index,
                    "createdAt": created_at,
                    "updatedAt": updated_at,
                });
                if let Some(obj) = data.as_object_mut() {
                    obj.retain(|_, v| !v.is_null());
                }
                records.push(SyncRecord {
                    table_name: "questions".to_string(),
                    row_id: id,
                    data,
                    version: sync_version,
                    deleted: false,
                });
            }
        }

        // Collect deleted progress
        {
            let mut stmt = conn.prepare(
                "SELECT question_id, sync_version FROM progress WHERE deleted = 1 AND synced_at IS NULL"
            ).map_err(|e| e.to_string())?;
            let rows = stmt.query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
            }).map_err(|e| e.to_string())?;
            for row in rows {
                let (qid, version) = row.map_err(|e| e.to_string())?;
                records.push(SyncRecord {
                    table_name: "progress".to_string(),
                    row_id: qid,
                    data: serde_json::json!({}),
                    version,
                    deleted: true,
                });
            }
        }

        // Collect unsynced active progress
        {
            let mut stmt = conn.prepare(
                "SELECT question_id, topic_id, status, confidence_level, times_reviewed, times_correct, times_incorrect, last_reviewed_at, next_review_at, created_at, updated_at, sync_version
                 FROM progress WHERE deleted = 0 AND synced_at IS NULL"
            ).map_err(|e| e.to_string())?;
            let rows = stmt.query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, i32>(3)?,
                    row.get::<_, i32>(4)?,
                    row.get::<_, i32>(5)?,
                    row.get::<_, i32>(6)?,
                    row.get::<_, Option<String>>(7)?,
                    row.get::<_, Option<String>>(8)?,
                    row.get::<_, String>(9)?,
                    row.get::<_, String>(10)?,
                    row.get::<_, i64>(11)?,
                ))
            }).map_err(|e| e.to_string())?;
            for row in rows {
                let (question_id, topic_id, status, confidence_level, times_reviewed, times_correct, times_incorrect, last_reviewed_at, next_review_at, created_at, updated_at, sync_version) = row.map_err(|e| e.to_string())?;
                let mut data = serde_json::json!({
                    "questionSyncUuid": question_id,
                    "topicSyncUuid": topic_id,
                    "status": status,
                    "confidenceLevel": confidence_level,
                    "timesReviewed": times_reviewed,
                    "timesCorrect": times_correct,
                    "timesIncorrect": times_incorrect,
                    "lastReviewedAt": last_reviewed_at,
                    "nextReviewAt": next_review_at,
                    "createdAt": created_at,
                    "updatedAt": updated_at,
                });
                if let Some(obj) = data.as_object_mut() {
                    obj.retain(|_, v| !v.is_null());
                }
                records.push(SyncRecord {
                    table_name: "progress".to_string(),
                    row_id: question_id,
                    data,
                    version: sync_version,
                    deleted: false,
                });
            }
        }

        // Collect deleted quiz_sessions
        {
            let mut stmt = conn.prepare(
                "SELECT id, sync_version FROM quiz_sessions WHERE deleted = 1 AND synced_at IS NULL"
            ).map_err(|e| e.to_string())?;
            let rows = stmt.query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
            }).map_err(|e| e.to_string())?;
            for row in rows {
                let (id, version) = row.map_err(|e| e.to_string())?;
                records.push(SyncRecord {
                    table_name: "quiz_sessions".to_string(),
                    row_id: id,
                    data: serde_json::json!({}),
                    version,
                    deleted: true,
                });
            }
        }

        // Collect unsynced active quiz_sessions
        {
            let mut stmt = conn.prepare(
                "SELECT id, session_type, topic_ids, question_ids, current_index, started_at, completed_at, results, sync_version
                 FROM quiz_sessions WHERE deleted = 0 AND synced_at IS NULL"
            ).map_err(|e| e.to_string())?;
            let rows = stmt.query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, i32>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, Option<String>>(6)?,
                    row.get::<_, Option<String>>(7)?,
                    row.get::<_, i64>(8)?,
                ))
            }).map_err(|e| e.to_string())?;
            for row in rows {
                let (id, session_type, topic_ids, question_ids, current_index, started_at, completed_at, results, sync_version) = row.map_err(|e| e.to_string())?;
                let mut data = serde_json::json!({
                    "sessionType": session_type,
                    "topicIds": topic_ids,
                    "questionIds": question_ids,
                    "currentIndex": current_index,
                    "startedAt": started_at,
                    "completedAt": completed_at,
                    "results": results,
                });
                if let Some(obj) = data.as_object_mut() {
                    obj.retain(|_, v| !v.is_null());
                }
                records.push(SyncRecord {
                    table_name: "quiz_sessions".to_string(),
                    row_id: id,
                    data,
                    version: sync_version,
                    deleted: false,
                });
            }
        }

        Ok(records)
    }

    /// Apply remote changes to local database
    fn apply_remote_changes(&self, records: &[SyncRecord]) -> Result<(), String> {
        let mut non_deleted: Vec<&SyncRecord> = records.iter().filter(|r| !r.deleted).collect();
        let mut deleted: Vec<&SyncRecord> = records.iter().filter(|r| r.deleted).collect();

        // Sort: parents first for inserts
        non_deleted.sort_by_key(|r| match r.table_name.as_str() {
            "topics" => 0,
            "questions" => 1,
            "progress" | "quiz_sessions" => 2,
            _ => 3,
        });

        // Sort: children first for deletes
        deleted.sort_by_key(|r| match r.table_name.as_str() {
            "progress" | "quiz_sessions" => 0,
            "questions" => 1,
            "topics" => 2,
            _ => 3,
        });

        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp();

        for record in non_deleted {
            match record.table_name.as_str() {
                "topics" => {
                    let data = &record.data;
                    let exists: bool = conn.query_row(
                        "SELECT COUNT(*) FROM topics WHERE id = ?",
                        rusqlite::params![record.row_id],
                        |row| row.get::<_, i64>(0).map(|c| c > 0),
                    ).unwrap_or(false);

                    if exists {
                        conn.execute(
                            "UPDATE topics SET name=?, description=?, slug=?, icon=?, color=?, subtopics=?, order_index=?, created_at=?, updated_at=?, sync_version=?, synced_at=?, deleted=0 WHERE id=?",
                            rusqlite::params![
                                data["name"].as_str().unwrap_or(""),
                                data["description"].as_str(),
                                data["slug"].as_str().unwrap_or(""),
                                data["icon"].as_str(),
                                data["color"].as_str(),
                                data["subtopics"].as_str(),
                                data["orderIndex"].as_i64().unwrap_or(0),
                                data["createdAt"].as_str().unwrap_or(""),
                                data["updatedAt"].as_str().unwrap_or(""),
                                record.version,
                                now,
                                record.row_id,
                            ],
                        ).map_err(|e| e.to_string())?;
                    } else {
                        conn.execute(
                            "INSERT INTO topics (id, name, description, slug, icon, color, subtopics, order_index, created_at, updated_at, sync_version, synced_at, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
                            rusqlite::params![
                                record.row_id,
                                data["name"].as_str().unwrap_or(""),
                                data["description"].as_str(),
                                data["slug"].as_str().unwrap_or(""),
                                data["icon"].as_str(),
                                data["color"].as_str(),
                                data["subtopics"].as_str(),
                                data["orderIndex"].as_i64().unwrap_or(0),
                                data["createdAt"].as_str().unwrap_or(""),
                                data["updatedAt"].as_str().unwrap_or(""),
                                record.version,
                                now,
                            ],
                        ).map_err(|e| e.to_string())?;
                    }
                }
                "questions" => {
                    let data = &record.data;
                    let exists: bool = conn.query_row(
                        "SELECT COUNT(*) FROM questions WHERE id = ?",
                        rusqlite::params![record.row_id],
                        |row| row.get::<_, i64>(0).map(|c| c > 0),
                    ).unwrap_or(false);

                    if exists {
                        conn.execute(
                            "UPDATE questions SET topic_id=?, subtopic=?, question_number=?, question=?, answer=?, tags=?, difficulty=?, order_index=?, created_at=?, updated_at=?, sync_version=?, synced_at=?, deleted=0 WHERE id=?",
                            rusqlite::params![
                                data["topicSyncUuid"].as_str().unwrap_or(""),
                                data["subtopic"].as_str(),
                                data["questionNumber"].as_i64().unwrap_or(0),
                                data["question"].as_str().unwrap_or(""),
                                data["answer"].as_str().unwrap_or(""),
                                data["tags"].as_str(),
                                data["difficulty"].as_str(),
                                data["orderIndex"].as_i64().unwrap_or(0),
                                data["createdAt"].as_str().unwrap_or(""),
                                data["updatedAt"].as_str().unwrap_or(""),
                                record.version,
                                now,
                                record.row_id,
                            ],
                        ).map_err(|e| e.to_string())?;
                    } else {
                        conn.execute(
                            "INSERT INTO questions (id, topic_id, subtopic, question_number, question, answer, tags, difficulty, order_index, created_at, updated_at, sync_version, synced_at, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
                            rusqlite::params![
                                record.row_id,
                                data["topicSyncUuid"].as_str().unwrap_or(""),
                                data["subtopic"].as_str(),
                                data["questionNumber"].as_i64().unwrap_or(0),
                                data["question"].as_str().unwrap_or(""),
                                data["answer"].as_str().unwrap_or(""),
                                data["tags"].as_str(),
                                data["difficulty"].as_str(),
                                data["orderIndex"].as_i64().unwrap_or(0),
                                data["createdAt"].as_str().unwrap_or(""),
                                data["updatedAt"].as_str().unwrap_or(""),
                                record.version,
                                now,
                            ],
                        ).map_err(|e| e.to_string())?;
                    }
                }
                "progress" => {
                    let data = &record.data;
                    let question_id = data["questionSyncUuid"].as_str().unwrap_or(&record.row_id);
                    let exists: bool = conn.query_row(
                        "SELECT COUNT(*) FROM progress WHERE question_id = ?",
                        rusqlite::params![question_id],
                        |row| row.get::<_, i64>(0).map(|c| c > 0),
                    ).unwrap_or(false);

                    if exists {
                        conn.execute(
                            "UPDATE progress SET topic_id=?, status=?, confidence_level=?, times_reviewed=?, times_correct=?, times_incorrect=?, last_reviewed_at=?, next_review_at=?, created_at=?, updated_at=?, sync_version=?, synced_at=?, deleted=0 WHERE question_id=?",
                            rusqlite::params![
                                data["topicSyncUuid"].as_str().unwrap_or(""),
                                data["status"].as_str().unwrap_or("NotStudied"),
                                data["confidenceLevel"].as_i64().unwrap_or(0),
                                data["timesReviewed"].as_i64().unwrap_or(0),
                                data["timesCorrect"].as_i64().unwrap_or(0),
                                data["timesIncorrect"].as_i64().unwrap_or(0),
                                data["lastReviewedAt"].as_str(),
                                data["nextReviewAt"].as_str(),
                                data["createdAt"].as_str().unwrap_or(""),
                                data["updatedAt"].as_str().unwrap_or(""),
                                record.version,
                                now,
                                question_id,
                            ],
                        ).map_err(|e| e.to_string())?;
                    } else {
                        let new_id = uuid::Uuid::new_v4().to_string();
                        conn.execute(
                            "INSERT INTO progress (question_id, topic_id, status, confidence_level, times_reviewed, times_correct, times_incorrect, last_reviewed_at, next_review_at, created_at, updated_at, id, sync_version, synced_at, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
                            rusqlite::params![
                                question_id,
                                data["topicSyncUuid"].as_str().unwrap_or(""),
                                data["status"].as_str().unwrap_or("NotStudied"),
                                data["confidenceLevel"].as_i64().unwrap_or(0),
                                data["timesReviewed"].as_i64().unwrap_or(0),
                                data["timesCorrect"].as_i64().unwrap_or(0),
                                data["timesIncorrect"].as_i64().unwrap_or(0),
                                data["lastReviewedAt"].as_str(),
                                data["nextReviewAt"].as_str(),
                                data["createdAt"].as_str().unwrap_or(""),
                                data["updatedAt"].as_str().unwrap_or(""),
                                new_id,
                                record.version,
                                now,
                            ],
                        ).map_err(|e| e.to_string())?;
                    }
                }
                "quiz_sessions" => {
                    let data = &record.data;
                    let exists: bool = conn.query_row(
                        "SELECT COUNT(*) FROM quiz_sessions WHERE id = ?",
                        rusqlite::params![record.row_id],
                        |row| row.get::<_, i64>(0).map(|c| c > 0),
                    ).unwrap_or(false);

                    if exists {
                        conn.execute(
                            "UPDATE quiz_sessions SET session_type=?, topic_ids=?, question_ids=?, current_index=?, started_at=?, completed_at=?, results=?, sync_version=?, synced_at=?, deleted=0 WHERE id=?",
                            rusqlite::params![
                                data["sessionType"].as_str().unwrap_or("Random"),
                                data["topicIds"].as_str(),
                                data["questionIds"].as_str(),
                                data["currentIndex"].as_i64().unwrap_or(0),
                                data["startedAt"].as_str().unwrap_or(""),
                                data["completedAt"].as_str(),
                                data["results"].as_str(),
                                record.version,
                                now,
                                record.row_id,
                            ],
                        ).map_err(|e| e.to_string())?;
                    } else {
                        conn.execute(
                            "INSERT INTO quiz_sessions (id, session_type, topic_ids, question_ids, current_index, started_at, completed_at, results, sync_version, synced_at, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
                            rusqlite::params![
                                record.row_id,
                                data["sessionType"].as_str().unwrap_or("Random"),
                                data["topicIds"].as_str(),
                                data["questionIds"].as_str(),
                                data["currentIndex"].as_i64().unwrap_or(0),
                                data["startedAt"].as_str().unwrap_or(""),
                                data["completedAt"].as_str(),
                                data["results"].as_str(),
                                record.version,
                                now,
                            ],
                        ).map_err(|e| e.to_string())?;
                    }
                }
                _ => {
                    eprintln!("Unknown table: {}", record.table_name);
                }
            }
        }

        // Apply deletes
        for record in deleted {
            match record.table_name.as_str() {
                "topics" => {
                    conn.execute("DELETE FROM topics WHERE id = ?", rusqlite::params![record.row_id])
                        .map_err(|e| e.to_string())?;
                }
                "questions" => {
                    conn.execute("DELETE FROM questions WHERE id = ?", rusqlite::params![record.row_id])
                        .map_err(|e| e.to_string())?;
                }
                "progress" => {
                    conn.execute("DELETE FROM progress WHERE question_id = ?", rusqlite::params![record.row_id])
                        .map_err(|e| e.to_string())?;
                }
                "quiz_sessions" => {
                    conn.execute("DELETE FROM quiz_sessions WHERE id = ?", rusqlite::params![record.row_id])
                        .map_err(|e| e.to_string())?;
                }
                _ => {
                    eprintln!("Unknown table: {}", record.table_name);
                }
            }
        }

        Ok(())
    }

    /// Mark records as synced
    fn mark_records_synced(&self, records: &[SyncRecord], synced_at: i64) -> Result<(), String> {
        let conn = self.db.get_connection();
        let conn = conn.lock().unwrap();

        for record in records {
            if record.deleted {
                // Hard-delete locally after successful push
                match record.table_name.as_str() {
                    "topics" => {
                        conn.execute("DELETE FROM topics WHERE id = ?", rusqlite::params![record.row_id])
                            .map_err(|e| e.to_string())?;
                    }
                    "questions" => {
                        conn.execute("DELETE FROM questions WHERE id = ?", rusqlite::params![record.row_id])
                            .map_err(|e| e.to_string())?;
                    }
                    "progress" => {
                        conn.execute("DELETE FROM progress WHERE question_id = ?", rusqlite::params![record.row_id])
                            .map_err(|e| e.to_string())?;
                    }
                    "quiz_sessions" => {
                        conn.execute("DELETE FROM quiz_sessions WHERE id = ?", rusqlite::params![record.row_id])
                            .map_err(|e| e.to_string())?;
                    }
                    _ => {}
                }
            } else {
                // Update synced_at for active records
                let (table, pk_col) = match record.table_name.as_str() {
                    "topics" => ("topics", "id"),
                    "questions" => ("questions", "id"),
                    "progress" => ("progress", "question_id"),
                    "quiz_sessions" => ("quiz_sessions", "id"),
                    _ => continue,
                };
                let query = format!(
                    "UPDATE {} SET synced_at = ? WHERE {} = ?",
                    table, pk_col
                );
                conn.execute(&query, rusqlite::params![synced_at, record.row_id])
                    .map_err(|e| e.to_string())?;
            }
        }
        Ok(())
    }

    /// Get checkpoint from database
    fn get_checkpoint(&self) -> Result<Option<Checkpoint>, String> {
        let result = self.db.get_checkpoint()?;
        match result {
            Some((updated_at_str, id)) => {
                let updated_at = DateTime::parse_from_rfc3339(&updated_at_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .map_err(|e| format!("Failed to parse checkpoint timestamp: {}", e))?;
                Ok(Some(Checkpoint::new(updated_at, id)))
            }
            None => Ok(None),
        }
    }

    /// Save checkpoint to database
    fn save_checkpoint(&self, checkpoint: &Checkpoint) -> Result<(), String> {
        let updated_at_str = checkpoint.updated_at.to_rfc3339();
        self.db.save_checkpoint(&updated_at_str, &checkpoint.id)
    }

    /// Get last sync timestamp
    fn get_last_sync_timestamp(&self) -> Result<Option<i64>, String> {
        let result = self.db.get_checkpoint()?;
        match result {
            Some((updated_at_str, _)) => {
                let updated_at = DateTime::parse_from_rfc3339(&updated_at_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .map_err(|e| format!("Failed to parse checkpoint timestamp: {}", e))?;
                Ok(Some(updated_at.timestamp()))
            }
            None => Ok(None),
        }
    }

    /// Count pending changes
    fn count_pending_changes(&self) -> Result<usize, String> {
        let mut count = 0;
        count += self.db.query_count("SELECT COUNT(*) FROM topics WHERE synced_at IS NULL")?;
        count += self.db.query_count("SELECT COUNT(*) FROM questions WHERE synced_at IS NULL")?;
        count += self.db.query_count("SELECT COUNT(*) FROM progress WHERE synced_at IS NULL")?;
        count += self.db.query_count("SELECT COUNT(*) FROM quiz_sessions WHERE synced_at IS NULL")?;
        Ok(count)
    }

    /// Get app_id from stored auth data
    async fn get_app_id(&self, app_handle: &tauri::AppHandle) -> Result<String, String> {
        use tauri_plugin_store::StoreExt;

        let store = app_handle
            .store("auth.json")
            .map_err(|e| format!("Failed to access store: {}", e))?;

        store
            .get("app_id")
            .and_then(|v| v.as_str().map(|s| s.to_string()))
            .ok_or_else(|| "No app ID found".to_string())
    }
}
