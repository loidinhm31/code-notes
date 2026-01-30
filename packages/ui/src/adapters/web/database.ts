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

    // Define schema with all fields including sync support
    this.version(1).stores({
      topics: "id, name, createdAt, updatedAt, sync_version, synced_at",
      questions:
        "id, topicId, questionNumber, createdAt, updatedAt, sync_version, synced_at",
      quizSessions: "id, startedAt, status, sync_version, synced_at",
      progress: "questionId, nextReviewAt, status, sync_version, synced_at",
      // Sync metadata (checkpoint, config, etc.)
      _syncMeta: "key",
      // Pending changes queue
      _pendingChanges: "++id, tableName, rowId",
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
