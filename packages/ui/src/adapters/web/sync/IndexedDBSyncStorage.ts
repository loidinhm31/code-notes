/**
 * IndexedDB Sync Storage
 *
 * Implements the LocalStorage pattern from qm-sync-client for IndexedDB/Dexie.
 * Provides methods for tracking pending changes, applying remote changes,
 * and managing sync checkpoints.
 *
 * Sync tracking approach (matches Rust/SQLite implementation):
 * - Creates/updates: Records have syncedAt = undefined (pending)
 * - Deletes: Tracked in _pendingChanges table before hard delete
 * - After successful sync: syncedAt is set, _pendingChanges entries removed
 */

import { db, getCurrentTimestamp, SYNC_META_KEYS } from "../database";
import type { Checkpoint, PullRecord, SyncRecord } from "@code-notes/shared";
import type {
  Topic,
  Question,
  QuestionProgress,
  QuizSession,
} from "@code-notes/shared";

/**
 * IndexedDB implementation of sync storage for code-notes.
 */
export class IndexedDBSyncStorage {
  // =========================================================================
  // Pending Changes
  // =========================================================================

  /**
   * Get all records that have pending changes (not yet synced).
   */
  async getPendingChanges(): Promise<SyncRecord[]> {
    const records: SyncRecord[] = [];

    // 1. Get unsynced topics
    const topics = await db.topics.toArray();
    for (const topic of topics) {
      if (topic.syncedAt === undefined || topic.syncedAt === null) {
        const subtopics = topic.subtopics
          ? JSON.stringify(topic.subtopics)
          : undefined;
        records.push({
          tableName: "topics",
          rowId: topic.id,
          data: {
            name: topic.name,
            description: topic.description,
            slug: topic.slug,
            icon: topic.icon,
            color: topic.color,
            subtopics,
            orderIndex: topic.order,
            createdAt: topic.createdAt,
            updatedAt: topic.updatedAt,
          },
          version: topic.syncVersion || 1,
          deleted: false,
        });
      }
    }

    // 2. Get unsynced questions
    const questions = await db.questions.toArray();
    for (const question of questions) {
      if (question.syncedAt === undefined || question.syncedAt === null) {
        const answer =
          typeof question.answer === "object"
            ? JSON.stringify(question.answer)
            : question.answer;
        const tags = question.tags ? JSON.stringify(question.tags) : undefined;
        records.push({
          tableName: "questions",
          rowId: question.id,
          data: {
            topicSyncUuid: question.topicId,
            subtopic: question.subtopic,
            questionNumber: question.questionNumber,
            question: question.question,
            answer,
            tags,
            difficulty: question.difficulty,
            orderIndex: question.order,
            createdAt: question.createdAt,
            updatedAt: question.updatedAt,
          },
          version: question.syncVersion || 1,
          deleted: false,
        });
      }
    }

    // 3. Get unsynced progress
    const progress = await db.progress.toArray();
    for (const p of progress) {
      if (p.syncedAt === undefined || p.syncedAt === null) {
        records.push({
          tableName: "progress",
          rowId: p.questionId, // questionId is the PK for progress in Dexie
          data: {
            questionSyncUuid: p.questionId,
            topicSyncUuid: p.topicId,
            status: typeof p.status === "string" ? p.status : String(p.status),
            confidenceLevel: p.confidenceLevel,
            timesReviewed: p.timesReviewed,
            timesCorrect: p.timesCorrect,
            timesIncorrect: p.timesIncorrect,
            lastReviewedAt: p.lastReviewedAt,
            nextReviewAt: p.nextReviewAt,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          },
          version: p.syncVersion || 1,
          deleted: false,
        });
      }
    }

    // 4. Get unsynced quiz sessions
    const sessions = await db.quizSessions.toArray();
    for (const session of sessions) {
      if (session.syncedAt === undefined || session.syncedAt === null) {
        const topicIds = session.topicIds
          ? JSON.stringify(session.topicIds)
          : undefined;
        const questionIds = session.questionIds
          ? JSON.stringify(session.questionIds)
          : undefined;
        const results = session.results
          ? JSON.stringify(session.results)
          : undefined;
        records.push({
          tableName: "quizSessions",
          rowId: session.id,
          data: {
            sessionType:
              typeof session.sessionType === "string"
                ? session.sessionType
                : String(session.sessionType),
            topicIds,
            questionIds,
            currentIndex: session.currentIndex,
            startedAt: session.startedAt,
            completedAt: session.completedAt,
            results,
          },
          version: session.syncVersion || 1,
          deleted: false,
        });
      }
    }

    // 5. Get pending deletes from _pendingChanges table
    const pendingDeletes = await db._pendingChanges
      .filter((change) => change.operation === "delete")
      .toArray();
    for (const change of pendingDeletes) {
      records.push({
        tableName: change.tableName,
        rowId: change.rowId,
        data: {},
        version: change.version,
        deleted: true,
      });
    }

    return records;
  }

  /**
   * Get the count of pending changes.
   */
  async getPendingChangesCount(): Promise<number> {
    let count = 0;

    const topics = await db.topics.toArray();
    count += topics.filter(
      (t) => t.syncedAt === undefined || t.syncedAt === null,
    ).length;

    const questions = await db.questions.toArray();
    count += questions.filter(
      (q) => q.syncedAt === undefined || q.syncedAt === null,
    ).length;

    const progress = await db.progress.toArray();
    count += progress.filter(
      (p) => p.syncedAt === undefined || p.syncedAt === null,
    ).length;

    const sessions = await db.quizSessions.toArray();
    count += sessions.filter(
      (s) => s.syncedAt === undefined || s.syncedAt === null,
    ).length;

    count += await db._pendingChanges
      .filter((change) => change.operation === "delete")
      .count();

    return count;
  }

  /**
   * Track a new pending change.
   */
  async trackChange(
    tableName: string,
    rowId: string,
    operation: "create" | "update" | "delete",
    data: Record<string, unknown>,
    version: number,
  ): Promise<void> {
    const existing = await db._pendingChanges
      .where({ tableName, rowId })
      .first();

    if (existing) {
      await db._pendingChanges.update(existing.id!, {
        operation,
        data,
        version,
        createdAt: getCurrentTimestamp(),
      });
    } else {
      await db._pendingChanges.add({
        tableName,
        rowId,
        operation,
        data,
        version,
        createdAt: getCurrentTimestamp(),
      });
    }
  }

  /**
   * Mark records as synced after successful push.
   */
  async markSynced(
    recordIds: Array<{ tableName: string; rowId: string }>,
  ): Promise<void> {
    const now = getCurrentTimestamp();

    await db.transaction(
      "rw",
      [
        db._pendingChanges,
        db.topics,
        db.questions,
        db.progress,
        db.quizSessions,
      ],
      async () => {
        for (const { tableName, rowId } of recordIds) {
          const localTableName = this.serverToLocalTableName(tableName);

          // Remove from pending changes
          await db._pendingChanges
            .where({ tableName: localTableName, rowId })
            .delete();

          // Update syncedAt on the actual record
          const table = this.getTable(tableName);
          if (table) {
            const exists = await table.get(rowId);
            if (exists) {
              await table.update(rowId, { syncedAt: now });
            }
          }
        }
      },
    );
  }

  /**
   * Convert server table name to local table name.
   */
  private serverToLocalTableName(tableName: string): string {
    return tableName;
  }

  // =========================================================================
  // Remote Changes
  // =========================================================================

  /**
   * Apply changes received from the server.
   */
  async applyRemoteChanges(records: PullRecord[]): Promise<void> {
    const now = getCurrentTimestamp();

    const nonDeleted = records.filter((r) => !r.deleted);
    const deleted = records.filter((r) => r.deleted);

    // Sort non-deleted: parents first (topics=0 -> questions=1 -> progress/quiz=2)
    nonDeleted.sort(
      (a, b) =>
        this.getTableOrder(a.tableName) - this.getTableOrder(b.tableName),
    );

    // Sort deleted: children first (reverse order)
    deleted.sort(
      (a, b) =>
        this.getTableOrder(b.tableName) - this.getTableOrder(a.tableName),
    );

    await db.transaction(
      "rw",
      [db.topics, db.questions, db.progress, db.quizSessions],
      async () => {
        for (const record of nonDeleted) {
          await this.upsertRecord(record, now);
        }
        for (const record of deleted) {
          await this.deleteRecord(record);
        }
      },
    );
  }

  /**
   * Insert or update a record from the server.
   */
  private async upsertRecord(
    record: PullRecord,
    syncedAt: number,
  ): Promise<void> {
    const data = record.data;

    switch (record.tableName) {
      case "topics": {
        let subtopics: string[] | undefined;
        if (data.subtopics) {
          try {
            subtopics =
              typeof data.subtopics === "string"
                ? JSON.parse(data.subtopics as string)
                : (data.subtopics as string[]);
          } catch {
            subtopics = [];
          }
        }

        const topic: Topic = {
          id: record.rowId,
          name: (data.name as string) || "",
          description: (data.description as string) || "",
          slug: (data.slug as string) || "",
          icon: (data.icon as string) || "",
          color: (data.color as string) || "",
          subtopics,
          order: (data.orderIndex as number) || 0,
          createdAt: (data.createdAt as string) || new Date().toISOString(),
          updatedAt: (data.updatedAt as string) || new Date().toISOString(),
          syncVersion: record.version,
          syncedAt: syncedAt,
        };
        await db.topics.put(topic);
        break;
      }

      case "questions": {
        let answer = data.answer;
        if (typeof answer === "string") {
          try {
            answer = JSON.parse(answer);
          } catch {
            answer = { markdown: answer };
          }
        }

        let tags: string[] = [];
        if (data.tags) {
          try {
            tags =
              typeof data.tags === "string"
                ? JSON.parse(data.tags as string)
                : (data.tags as string[]);
          } catch {
            tags = [];
          }
        }

        const question: Question = {
          id: record.rowId,
          topicId: (data.topicSyncUuid as string) || "",
          subtopic: data.subtopic as string | undefined,
          questionNumber: (data.questionNumber as number) || 0,
          question: (data.question as string) || "",
          answer: answer as { markdown: string },
          tags,
          difficulty:
            (data.difficulty as "beginner" | "intermediate" | "advanced") ||
            "beginner",
          order: (data.orderIndex as number) || 0,
          createdAt: (data.createdAt as string) || new Date().toISOString(),
          updatedAt: (data.updatedAt as string) || new Date().toISOString(),
          syncVersion: record.version,
          syncedAt: syncedAt,
        };
        await db.questions.put(question);
        break;
      }

      case "progress": {
        const progressRecord: QuestionProgress = {
          questionId: (data.questionSyncUuid as string) || record.rowId,
          topicId: (data.topicSyncUuid as string) || "",
          status: ((data.status as string) ||
            "NotStudied") as QuestionProgress["status"],
          confidenceLevel: (data.confidenceLevel as number) || 0,
          timesReviewed: (data.timesReviewed as number) || 0,
          timesCorrect: (data.timesCorrect as number) || 0,
          timesIncorrect: (data.timesIncorrect as number) || 0,
          lastReviewedAt: data.lastReviewedAt as string | undefined,
          nextReviewAt: data.nextReviewAt as string | undefined,
          createdAt: (data.createdAt as string) || new Date().toISOString(),
          updatedAt: (data.updatedAt as string) || new Date().toISOString(),
          syncVersion: record.version,
          syncedAt: syncedAt,
        };
        await db.progress.put(progressRecord);
        break;
      }

      case "quizSessions": {
        let topicIds: string[] = [];
        let questionIds: string[] = [];
        let results: QuizSession["results"] = [];

        if (data.topicIds) {
          try {
            topicIds =
              typeof data.topicIds === "string"
                ? JSON.parse(data.topicIds as string)
                : (data.topicIds as string[]);
          } catch {
            /* empty */
          }
        }
        if (data.questionIds) {
          try {
            questionIds =
              typeof data.questionIds === "string"
                ? JSON.parse(data.questionIds as string)
                : (data.questionIds as string[]);
          } catch {
            /* empty */
          }
        }
        if (data.results) {
          try {
            results =
              typeof data.results === "string"
                ? JSON.parse(data.results as string)
                : (data.results as QuizSession["results"]);
          } catch {
            /* empty */
          }
        }

        const session: QuizSession = {
          id: record.rowId,
          sessionType: ((data.sessionType as string) ||
            "Random") as QuizSession["sessionType"],
          topicIds,
          questionIds,
          currentIndex: (data.currentIndex as number) || 0,
          startedAt: (data.startedAt as string) || new Date().toISOString(),
          completedAt: data.completedAt as string | undefined,
          results,
          syncVersion: record.version,
          syncedAt: syncedAt,
        };
        await db.quizSessions.put(session);
        break;
      }

      default:
        console.warn(`Unknown table: ${record.tableName}`);
    }
  }

  /**
   * Delete a record that was deleted on the server.
   */
  private async deleteRecord(record: PullRecord): Promise<void> {
    const table = this.getTable(record.tableName);
    if (!table) {
      console.warn(`Unknown table: ${record.tableName}`);
      return;
    }
    await table.delete(record.rowId);
  }

  // =========================================================================
  // Checkpoint Management
  // =========================================================================

  async getCheckpoint(): Promise<Checkpoint | undefined> {
    const checkpointJson = await db.getSyncMeta(SYNC_META_KEYS.CHECKPOINT);
    if (!checkpointJson) return undefined;
    try {
      return JSON.parse(checkpointJson) as Checkpoint;
    } catch {
      return undefined;
    }
  }

  async saveCheckpoint(checkpoint: Checkpoint): Promise<void> {
    await db.setSyncMeta(SYNC_META_KEYS.CHECKPOINT, JSON.stringify(checkpoint));
  }

  async getLastSyncAt(): Promise<number | undefined> {
    const value = await db.getSyncMeta(SYNC_META_KEYS.LAST_SYNC_AT);
    return value ? parseInt(value, 10) : undefined;
  }

  async saveLastSyncAt(timestamp: number): Promise<void> {
    await db.setSyncMeta(SYNC_META_KEYS.LAST_SYNC_AT, timestamp.toString());
  }

  // =========================================================================
  // Cleanup
  // =========================================================================

  async cleanupDeleted(): Promise<number> {
    return 0;
  }

  async clearPendingChanges(): Promise<void> {
    await db._pendingChanges.clear();
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private getTable(tableName: string) {
    switch (tableName) {
      case "topics":
        return db.topics;
      case "questions":
        return db.questions;
      case "progress":
        return db.progress;
      case "quizSessions":
        return db.quizSessions;
      default:
        return undefined;
    }
  }

  /**
   * Get table order for FK-safe insert/delete ordering.
   * Lower = parent (insert first, delete last)
   */
  private getTableOrder(tableName: string): number {
    switch (tableName) {
      case "topics":
        return 0;
      case "questions":
        return 1;
      case "progress":
      case "quizSessions":
        return 2;
      default:
        return 99;
    }
  }
}
