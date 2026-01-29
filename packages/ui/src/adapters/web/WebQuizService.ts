import { db } from "../../services/web/DexieDB";
import type { IQuizService } from "../../services/interfaces";
import type {
  QuizSession,
  CreateQuizSessionDto,
  QuizResult,
} from "@code-notes/shared";
import { v4 as uuidv4 } from "uuid";

export class WebQuizService implements IQuizService {
  async createSession(dto: CreateQuizSessionDto): Promise<QuizSession> {
    // Gather question IDs based on session configuration
    let questionIds: string[] = [];

    if (dto.topicIds && dto.topicIds.length > 0) {
      // TopicFocused: get questions from specified topics
      for (const topicId of dto.topicIds) {
        const questions = await db.questions
          .where("topicId")
          .equals(topicId)
          .toArray();
        questionIds.push(...questions.map((q) => q.id));
      }
    } else {
      // Get all questions
      const questions = await db.questions.toArray();
      questionIds = questions.map((q) => q.id);
    }

    // Filter by difficulty if specified
    if (dto.difficulty) {
      const filtered = await db.questions
        .filter(
          (q) => questionIds.includes(q.id) && q.difficulty === dto.difficulty,
        )
        .toArray();
      questionIds = filtered.map((q) => q.id);
    }

    // Shuffle for random/quick modes
    if (dto.sessionType === "Random" || dto.sessionType === "QuickRefresher") {
      questionIds = this.shuffle(questionIds);
    }

    // Limit questions
    const maxQuestions = dto.maxQuestions || questionIds.length;
    questionIds = questionIds.slice(0, maxQuestions);

    const session: QuizSession = {
      id: uuidv4(),
      sessionType: dto.sessionType,
      topicIds: dto.topicIds || [],
      questionIds,
      currentIndex: 0,
      startedAt: new Date().toISOString(),
      results: [],
    };

    await db.quizSessions.add(session);
    return session;
  }

  async getSession(sessionId: string): Promise<QuizSession | null> {
    return (await db.quizSessions.get(sessionId)) || null;
  }

  async getActiveSession(): Promise<QuizSession | null> {
    // Find a session that hasn't been completed
    const sessions = await db.quizSessions
      .orderBy("startedAt")
      .reverse()
      .toArray();
    return sessions.find((s) => !s.completedAt) || null;
  }

  async submitAnswer(
    sessionId: string,
    result: QuizResult,
  ): Promise<QuizSession> {
    const session = await db.quizSessions.get(sessionId);
    if (!session) throw new Error("Session not found");

    session.results.push(result);
    session.currentIndex = session.results.length;

    await db.quizSessions.put(session);
    return session;
  }

  async completeSession(sessionId: string): Promise<QuizSession> {
    const session = await db.quizSessions.get(sessionId);
    if (!session) throw new Error("Session not found");

    session.completedAt = new Date().toISOString();
    await db.quizSessions.put(session);
    return session;
  }

  async getHistory(limit?: number): Promise<QuizSession[]> {
    let query = db.quizSessions.orderBy("startedAt").reverse();
    const sessions = await query.toArray();

    // Filter to completed sessions
    const completed = sessions.filter((s) => s.completedAt);
    return limit ? completed.slice(0, limit) : completed;
  }

  private shuffle(array: string[]): string[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
