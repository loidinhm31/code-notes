import { getQuizService } from "../adapters/factory";
import type {
  CreateQuizSessionDto,
  QuizSession,
  QuizResult,
} from "@code-notes/shared";

/**
 * Create a new quiz session
 */
export const createSession = (
  dto: CreateQuizSessionDto,
): Promise<QuizSession> => {
  return getQuizService().createSession(dto);
};

/**
 * Get a quiz session by ID
 */
export const getSession = (sessionId: string): Promise<QuizSession | null> => {
  return getQuizService().getSession(sessionId);
};

/**
 * Get the current active quiz session
 */
export const getActiveSession = (): Promise<QuizSession | null> => {
  return getQuizService().getActiveSession();
};

/**
 * Submit an answer for the current question in a session
 */
export const submitAnswer = (
  sessionId: string,
  result: QuizResult,
): Promise<QuizSession> => {
  return getQuizService().submitAnswer(sessionId, result);
};

/**
 * Complete a quiz session
 */
export const completeSession = (sessionId: string): Promise<QuizSession> => {
  return getQuizService().completeSession(sessionId);
};

/**
 * Get quiz history
 * @param limit Maximum number of sessions to return
 */
export const getHistory = (limit?: number): Promise<QuizSession[]> => {
  return getQuizService().getHistory(limit);
};
