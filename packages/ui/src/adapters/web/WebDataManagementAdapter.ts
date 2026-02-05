import type {
  Topic,
  Question,
  QuestionProgress,
  QuizSession,
  DatabaseStats,
  GenericImportResult,
} from "@code-notes/shared";
import { IDataManagementService } from "@code-notes/ui/adapters/factory/interfaces";
import { ExportResult } from "@code-notes/shared";
import { db } from "@code-notes/ui/adapters/web";

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

export class WebDataManagementAdapter implements IDataManagementService {
  async getDatabaseStats(): Promise<DatabaseStats> {
    const topicsCount = await db.topics.count();
    const questionsCount = await db.questions.count();

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

      await db.transaction(
        "rw",
        db.topics,
        db.questions,
        db.progress,
        db.quizSessions,
        async () => {
          if (merge) {
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
