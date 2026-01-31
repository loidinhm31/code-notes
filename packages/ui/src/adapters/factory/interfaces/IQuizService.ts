import type {
  CreateQuizSessionDto,
  QuizSession,
  QuizResult,
} from "@code-notes/shared";

export interface IQuizService {
  createSession(dto: CreateQuizSessionDto): Promise<QuizSession>;
  getSession(sessionId: string): Promise<QuizSession | null>;
  getActiveSession(): Promise<QuizSession | null>;
  submitAnswer(sessionId: string, result: QuizResult): Promise<QuizSession>;
  completeSession(sessionId: string): Promise<QuizSession>;
  getHistory(limit?: number): Promise<QuizSession[]>;
}
