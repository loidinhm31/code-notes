import Dexie, { type EntityTable, type Table } from "dexie";
import type {
  Topic,
  Question,
  QuizSession,
  QuestionProgress,
} from "@code-notes/shared";

// =============================================================================
// Sync Metadata Types
// =============================================================================

/**
 * Sync metadata stored in IndexedDB
 */
export interface SyncMeta {
  key: string;
  value: string;
}

/**
 * Pending change record for tracking local modifications
 */
export interface PendingChange {
  id?: number; // Auto-increment
  tableName: string;
  rowId: string;
  operation: "create" | "update" | "delete";
  data: Record<string, unknown>;
  version: number;
  createdAt: number;
}

// =============================================================================
// Database Class
// =============================================================================

export class CodeNotesDB extends Dexie {
  topics!: EntityTable<Topic, "id">;
  questions!: EntityTable<Question, "id">;
  quizSessions!: EntityTable<QuizSession, "id">;
  progress!: EntityTable<QuestionProgress, "questionId">;

  // Sync tables
  _syncMeta!: Table<SyncMeta, string>;
  _pendingChanges!: Table<PendingChange, number>;

  constructor() {
    super("CodeNotesDB");

    // Version 1: Original schema with snake_case sync fields
    this.version(1).stores({
      topics: "id, name, createdAt, updatedAt, sync_version, synced_at",
      questions:
        "id, topicId, questionNumber, createdAt, updatedAt, sync_version, synced_at",
      quizSessions: "id, startedAt, status, sync_version, synced_at",
      progress: "questionId, nextReviewAt, status, sync_version, synced_at",
      _syncMeta: "key",
      _pendingChanges: "++id, tableName, rowId",
    });

    // Version 2: Migrate to camelCase sync fields
    this.version(2)
      .stores({
        topics: "id, name, createdAt, updatedAt, syncVersion, syncedAt",
        questions:
          "id, topicId, questionNumber, createdAt, updatedAt, syncVersion, syncedAt",
        quizSessions: "id, startedAt, status, syncVersion, syncedAt",
        progress: "questionId, nextReviewAt, status, syncVersion, syncedAt",
        _syncMeta: "key",
        _pendingChanges: "++id, tableName, rowId",
      })
      .upgrade((tx) => {
        // Migrate topics: rename sync_version → syncVersion, synced_at → syncedAt
        tx.table("topics")
          .toCollection()
          .modify((topic: Record<string, unknown>) => {
            if ("sync_version" in topic) {
              topic.syncVersion = topic.sync_version;
              delete topic.sync_version;
            }
            if ("synced_at" in topic) {
              topic.syncedAt = topic.synced_at;
              delete topic.synced_at;
            }
          });

        // Migrate questions
        tx.table("questions")
          .toCollection()
          .modify((question: Record<string, unknown>) => {
            if ("sync_version" in question) {
              question.syncVersion = question.sync_version;
              delete question.sync_version;
            }
            if ("synced_at" in question) {
              question.syncedAt = question.synced_at;
              delete question.synced_at;
            }
          });

        // Migrate quizSessions
        tx.table("quizSessions")
          .toCollection()
          .modify((session: Record<string, unknown>) => {
            if ("sync_version" in session) {
              session.syncVersion = session.sync_version;
              delete session.sync_version;
            }
            if ("synced_at" in session) {
              session.syncedAt = session.synced_at;
              delete session.synced_at;
            }
          });

        // Migrate progress
        tx.table("progress")
          .toCollection()
          .modify((progress: Record<string, unknown>) => {
            if ("sync_version" in progress) {
              progress.syncVersion = progress.sync_version;
              delete progress.sync_version;
            }
            if ("synced_at" in progress) {
              progress.syncedAt = progress.synced_at;
              delete progress.synced_at;
            }
          });
      });

    // Map table names
    this.topics = this.table("topics");
    this.questions = this.table("questions");
    this.quizSessions = this.table("quizSessions");
    this.progress = this.table("progress");
    this._syncMeta = this.table("_syncMeta");
    this._pendingChanges = this.table("_pendingChanges");
  }

  /**
   * Get a sync meta value by key
   */
  async getSyncMeta(key: string): Promise<string | undefined> {
    const record = await this._syncMeta.get(key);
    return record?.value;
  }

  /**
   * Set a sync meta value
   */
  async setSyncMeta(key: string, value: string): Promise<void> {
    await this._syncMeta.put({ key, value });
  }

  /**
   * Delete a sync meta value
   */
  async deleteSyncMeta(key: string): Promise<void> {
    await this._syncMeta.delete(key);
  }
}

export const db = new CodeNotesDB();

/**
 * Get current Unix timestamp in seconds
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

export const SYNC_META_KEYS = {
  CHECKPOINT: "checkpoint",
  LAST_SYNC_AT: "lastSyncAt",
} as const;

/**
 * Track a delete operation in the pending changes table.
 */
export async function trackDelete(
  tableName: string,
  id: string,
  syncVersion: number,
): Promise<void> {
  await db._pendingChanges.add({
    tableName,
    rowId: id,
    operation: "delete",
    data: {},
    version: (syncVersion || 0) + 1,
    createdAt: getCurrentTimestamp(),
  });
}
