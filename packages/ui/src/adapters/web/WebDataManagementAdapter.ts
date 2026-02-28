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
import { getDb } from "@code-notes/ui/adapters/web";

// Structure matches the JSON format used for export/import
interface DatabaseExport {
  version: string;
  exportedAt: string;
  database: {
    topics: Topic[];
    questions: Question[];
  };
  progress: {
    version: string;
    data: QuestionProgress[];
  };
  quizSessions: {
    version: string;
    sessions: QuizSession[];
  };
}

export class WebDataManagementAdapter implements IDataManagementService {
  async getDatabaseStats(): Promise<DatabaseStats> {
    const topicsCount = await getDb().topics.count();
    const questionsCount = await getDb().questions.count();

    return {
      topicsCount: topicsCount,
      questionsCount: questionsCount,
      databaseSize: 0,
    };
  }

  async exportDatabase(
    filename: string = "code-notes-backup.json",
  ): Promise<ExportResult> {
    try {
      const topics = await getDb().topics.toArray();
      const questions = await getDb().questions.toArray();
      const progress = await getDb().progress.toArray();
      const quizSessions = await getDb().quizSessions.toArray();

      const exportData: DatabaseExport = {
        version: "2.1",
        exportedAt: new Date().toISOString(),
        database: {
          topics,
          questions,
        },
        progress: {
          version: "2.1",
          data: progress,
        },
        quizSessions: {
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
        exportedPath: "Downloads folder",
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
      const data = JSON.parse(content) as Record<string, unknown>;

      // Basic validation
      // Supports v2 (nested) and maybe v1 (flat)
      // Also supports both camelCase and snake_case for backwards compatibility

      let topics: Topic[] = [];
      let questions: Question[] = [];
      let progress: QuestionProgress[] = [];
      let sessions: QuizSession[] = [];

      const database = data.database as
        | { topics?: Topic[]; questions?: Question[] }
        | undefined;
      const progressData = (data.progress || data.progress_data) as
        | { data?: QuestionProgress[] }
        | undefined;
      const quizSessionsData = (data.quizSessions || data.quiz_sessions) as
        | { sessions?: QuizSession[] }
        | undefined;

      if (database && Array.isArray(database.topics)) {
        // V2 format
        topics = database.topics;
        questions = database.questions || [];
        progress = progressData?.data || [];
        sessions = quizSessionsData?.sessions || [];
      } else if (Array.isArray(data.topics)) {
        // V1 format (fallback)
        topics = data.topics as Topic[];
        questions = (data.questions as Question[]) || [];
      } else {
        throw new Error("Invalid database format");
      }

      if (!merge) {
        // Clear all tables
        await getDb().transaction(
          "rw",
          getDb().topics,
          getDb().questions,
          getDb().progress,
          getDb().quizSessions,
          async () => {
            await getDb().topics.clear();
            await getDb().questions.clear();
            await getDb().progress.clear();
            await getDb().quizSessions.clear();
          },
        );
      }

      await getDb().transaction(
        "rw",
        getDb().topics,
        getDb().questions,
        getDb().progress,
        getDb().quizSessions,
        async () => {
          if (merge) {
            const existingTopicIds = new Set(
              await getDb().topics.toCollection().primaryKeys(),
            );
            const newTopics = topics.filter((t) => !existingTopicIds.has(t.id));
            if (newTopics.length > 0) await getDb().topics.bulkAdd(newTopics);

            const existingQuestionIds = new Set(
              await getDb().questions.toCollection().primaryKeys(),
            );
            const newQuestions = questions.filter(
              (q) => !existingQuestionIds.has(q.id),
            );
            if (newQuestions.length > 0)
              await getDb().questions.bulkAdd(newQuestions);

            const existingProgressIds = new Set(
              await getDb().progress.toCollection().primaryKeys(),
            );
            const newProgress = progress.filter(
              (p) => !existingProgressIds.has(p.questionId),
            );
            if (newProgress.length > 0) await getDb().progress.bulkAdd(newProgress);

            const existingSessionIds = new Set(
              await getDb().quizSessions.toCollection().primaryKeys(),
            );
            const newSessions = sessions.filter(
              (s) => !existingSessionIds.has(s.id),
            );
            if (newSessions.length > 0)
              await getDb().quizSessions.bulkAdd(newSessions);
          } else {
            // Replace mode: We already cleared. So just add all.
            if (topics.length > 0) await getDb().topics.bulkAdd(topics);
            if (questions.length > 0) await getDb().questions.bulkAdd(questions);
            if (progress.length > 0) await getDb().progress.bulkAdd(progress);
            if (sessions.length > 0) await getDb().quizSessions.bulkAdd(sessions);
          }
        },
      );

      const finalTopicsCount = await getDb().topics.count();
      const finalQuestionsCount = await getDb().questions.count();
      const finalProgressCount = await getDb().progress.count();
      const finalSessionsCount = await getDb().quizSessions.count();

      return {
        success: true,
        message: "Import successful",
        topicsCount: finalTopicsCount,
        questionsCount: finalQuestionsCount,
        progressCount: finalProgressCount,
        quizSessionsCount: finalSessionsCount,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
        topicsCount: 0,
        questionsCount: 0,
        progressCount: 0,
        quizSessionsCount: 0,
      };
    }
  }
}
