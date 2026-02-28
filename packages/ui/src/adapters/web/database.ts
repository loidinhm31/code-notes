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

  constructor(dbName = "CodeNotesDB") {
    super(dbName);

    this.version(1).stores({
      topics: "id, name, createdAt, updatedAt, syncVersion, syncedAt",
      questions:
        "id, topicId, questionNumber, createdAt, updatedAt, syncVersion, syncedAt",
      quizSessions: "id, startedAt, status, syncVersion, syncedAt",
      progress: "questionId, nextReviewAt, status, syncVersion, syncedAt",
      _syncMeta: "key",
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

// =============================================================================
// Per-user DB management
// =============================================================================

let _db: CodeNotesDB | null = null;
let _currentUserId: string | null = null;

async function hashUserId(userId: string): Promise<string> {
  const encoded = new TextEncoder().encode(userId);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 12);
}

/**
 * Initialize (or reinitialize) the DB for a specific user.
 * If userId is undefined (standalone mode), uses the legacy "CodeNotesDB" name.
 * Calling with the same userId is a no-op.
 */
export async function initDb(userId?: string): Promise<CodeNotesDB> {
  if (!userId) {
    if (!_db || _currentUserId !== null) {
      if (_db) _db.close();
      _db = new CodeNotesDB("CodeNotesDB");
      _currentUserId = null;
    }
    return _db;
  }
  if (_db && _currentUserId === userId) return _db;
  if (_db) _db.close();
  const prefix = await hashUserId(userId);
  _db = new CodeNotesDB(`CodeNotesDB_${prefix}`);
  _currentUserId = userId;
  return _db;
}

/** Returns the active DB instance. Throws if initDb() has not been called. */
export function getDb(): CodeNotesDB {
  if (!_db) throw new Error("CodeNotesDB not initialized. Call initDb() first.");
  return _db;
}

/** Close and delete the current user's IndexedDB. Used on logout. */
export async function deleteCurrentDb(): Promise<void> {
  if (_db) {
    const name = _db.name;
    _db.close();
    await Dexie.delete(name);
    _db = null;
    _currentUserId = null;
  }
}

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
  await getDb()._pendingChanges.add({
    tableName,
    rowId: id,
    operation: "delete",
    data: {},
    version: (syncVersion || 0) + 1,
    createdAt: getCurrentTimestamp(),
  });
}
