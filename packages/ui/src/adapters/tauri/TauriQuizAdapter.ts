import { invoke } from "@tauri-apps/api/core";
import type {
  QuizSession,
  CreateQuizSessionDto,
  QuizResult,
} from "@code-notes/shared";

export const quizService = {
  createSession: async (dto: CreateQuizSessionDto): Promise<QuizSession> => {
    return await invoke<QuizSession>("create_quiz_session", { dto });
  },

  getSession: async (sessionId: string): Promise<QuizSession | null> => {
    return await invoke<QuizSession | null>("get_quiz_session", { sessionId });
  },

  getActiveSession: async (): Promise<QuizSession | null> => {
    return await invoke<QuizSession | null>("get_active_quiz_session");
  },

  submitAnswer: async (
    sessionId: string,
    result: QuizResult,
  ): Promise<QuizSession> => {
    return await invoke<QuizSession>("submit_quiz_answer", {
      sessionId,
      result,
    });
  },

  completeSession: async (sessionId: string): Promise<QuizSession> => {
    return await invoke<QuizSession>("complete_quiz_session", { sessionId });
  },

  getHistory: async (limit?: number): Promise<QuizSession[]> => {
    return await invoke<QuizSession[]>("get_quiz_history", { limit });
  },
};
