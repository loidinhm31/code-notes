import { db } from "./DexieDB";
import type {
  IDataManagementService,
  DatabaseStats,
  ExportResult,
  GenericImportResult,
} from "../interfaces";
import type {
  Topic,
  Question,
  QuestionProgress,
  QuizSession,
} from "@code-notes/shared";

// Structure matches the JSON format used in Tauri
interface DatabaseExport {
  version: string;
  exported_at: string;
  database: {
    topics: Topic[];
    questions: Question[];
  };
  progress: {
    version: string;
    data: QuestionProgress[];
  };
  quiz_sessions: {
    version: string;
    sessions: QuizSession[];
  };
}

export class WebDataManagementService implements IDataManagementService {
  async getDatabaseStats(): Promise<DatabaseStats> {
    const topicsCount = await db.topics.count();
    const questionsCount = await db.questions.count();

    // Rough estimate of size in browser (JSON stringify estimation)
    // Accurate size is hard in IndexedDB without specific APIs or overhead
    let size = 0;
    // Sample check? Or just 0 if hard.
    // Let's optimize by just returning a placeholder or simple estimation if needed,
    // but for now 0 is safer than hanging on large DBs.
    // Actually, let's fetch all and measure for consistency with "Export size" expectation if feasible.
    // For large DBs this is slow. Tauri implementation does file size.
    // Let's skip size or returns 0.

    return {
      topics_count: topicsCount,
      questions_count: questionsCount,
      database_size: 0,
    };
  }

  async exportDatabase(
    filename: string = "code-notes-backup.json",
  ): Promise<ExportResult> {
    try {
      const topics = await db.topics.toArray();
      const questions = await db.questions.toArray();
      const progress = await db.progress.toArray();
      const quizSessions = await db.quizSessions.toArray();

      const exportData: DatabaseExport = {
        version: "2.1",
        exported_at: new Date().toISOString(),
        database: {
          topics,
          questions,
        },
        progress: {
          version: "2.1",
          data: progress,
        },
        quiz_sessions: {
          version: "2.1",
          sessions: quizSessions,
        },
      };

      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return {
        success: true,
        message: "Export started",
        exported_path: "Downloads folder",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async importDatabase(
    content: string,
    merge: boolean,
  ): Promise<GenericImportResult> {
    try {
      const data = JSON.parse(content) as any;

      // Basic validation
      // Supports v2 (nested) and maybe v1 (flat) similar to Tauri?
      // Let's implement v2 structure support first as it's the current export format.

      let topics: Topic[] = [];
      let questions: Question[] = [];
      let progress: QuestionProgress[] = [];
      let sessions: QuizSession[] = [];

      if (data.database && Array.isArray(data.database.topics)) {
        // V2 format
        topics = data.database.topics;
        questions = data.database.questions || [];
        progress = data.progress?.data || [];
        sessions = data.quiz_sessions?.sessions || [];
      } else if (Array.isArray(data.topics)) {
        // V1 format (fallback)
        topics = data.topics;
        questions = data.questions || [];
      } else {
        throw new Error("Invalid database format");
      }

      if (!merge) {
        // Clear all tables
        await db.transaction(
          "rw",
          db.topics,
          db.questions,
          db.progress,
          db.quizSessions,
          async () => {
            await db.topics.clear();
            await db.questions.clear();
            await db.progress.clear();
            await db.quizSessions.clear();
          },
        );
      }

      // Bulk add/put
      // Dexie bulkPut overwrites by key, bulkAdd fails on duplicates.
      // "Merge" implies overwriting existing or keeping?
      // In Tauri "Merge": Add new items, "skip duplicates by ID" (actually check existence).
      // "put" in Dexie overwrites. "add" fails.
      // If "Merge" means "Update existing and Add new", then bulkPut is correct.
      // If "Merge" means "Only Add new, Keep existing untouched", then we need logic.
      // The UI says "Merge (add new items, keep existing)". Keep existing usually means don't overwrite?
      // "Merge (add new items, keep existing)" -> "Skip existing"?
      // Let's assume standard behavior: Update or specific logic.
      // Tauri logic I wrote: "if !exists { push }". So it skips duplicates!
      // I should replicate "Skip duplicates" for Merge.

      await db.transaction(
        "rw",
        db.topics,
        db.questions,
        db.progress,
        db.quizSessions,
        async () => {
          if (merge) {
            // Filter out existing IDs?
            // Or just use 'add' and catch errors? bulkAdd doesn't partial fail easily unless refined.
            // Doing check manually for correctness with "Keep Existing".

            const existingTopicIds = new Set(
              await db.topics.toCollection().primaryKeys(),
            );
            const newTopics = topics.filter((t) => !existingTopicIds.has(t.id));
            if (newTopics.length > 0) await db.topics.bulkAdd(newTopics);

            const existingQuestionIds = new Set(
              await db.questions.toCollection().primaryKeys(),
            );
            const newQuestions = questions.filter(
              (q) => !existingQuestionIds.has(q.id),
            );
            if (newQuestions.length > 0)
              await db.questions.bulkAdd(newQuestions);

            const existingProgressIds = new Set(
              await db.progress.toCollection().primaryKeys(),
            ); // [questionId]
            // Progress primary key is questionId? Yes.
            const newProgress = progress.filter(
              (p) => !existingProgressIds.has(p.questionId),
            );
            if (newProgress.length > 0) await db.progress.bulkAdd(newProgress);

            const existingSessionIds = new Set(
              await db.quizSessions.toCollection().primaryKeys(),
            );
            const newSessions = sessions.filter(
              (s) => !existingSessionIds.has(s.id),
            );
            if (newSessions.length > 0)
              await db.quizSessions.bulkAdd(newSessions);
          } else {
            // Replace mode: We already cleared. So just add all.
            if (topics.length > 0) await db.topics.bulkAdd(topics);
            if (questions.length > 0) await db.questions.bulkAdd(questions);
            if (progress.length > 0) await db.progress.bulkAdd(progress);
            if (sessions.length > 0) await db.quizSessions.bulkAdd(sessions);
          }
        },
      );

      const finalTopicsCount = await db.topics.count();
      const finalQuestionsCount = await db.questions.count();
      const finalProgressCount = await db.progress.count();
      const finalSessionsCount = await db.quizSessions.count();

      return {
        success: true,
        message: "Import successful",
        topics_count: finalTopicsCount,
        questions_count: finalQuestionsCount,
        progress_count: finalProgressCount,
        quiz_sessions_count: finalSessionsCount,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
        topics_count: 0,
        questions_count: 0,
        progress_count: 0,
        quiz_sessions_count: 0,
      };
    }
  }
}
