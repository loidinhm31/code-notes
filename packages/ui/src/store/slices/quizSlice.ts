import { StateCreator } from "zustand";
import { getQuizService, getProgressService } from "@code-notes/ui/services";
import type {
  QuizSession,
  CreateQuizSessionDto,
  QuizResult,
  Question,
} from "@code-notes/shared";

export interface QuizSlice {
  // State
  activeSession: QuizSession | null;
  quizHistory: QuizSession[];
  quizLoading: boolean;
  quizError: string | null;

  // Actions
  createQuizSession: (dto: CreateQuizSessionDto) => Promise<QuizSession>;
  loadActiveSession: () => Promise<void>;
  submitAnswer: (result: QuizResult) => Promise<void>;
  completeQuiz: () => Promise<QuizSession>;
  fetchQuizHistory: (limit?: number) => Promise<void>;
  clearActiveSession: () => void;

  // Helper methods
  getCurrentQuestion: (questions: Question[]) => Question | null;
  getQuizProgress: () => { current: number; total: number };
  isQuizCompleted: () => boolean;
}

export const createQuizSlice: StateCreator<QuizSlice> = (set, get) => ({
  // Initial state
  activeSession: null,
  quizHistory: [],
  quizLoading: false,
  quizError: null,

  // Create a new quiz session
  createQuizSession: async (dto: CreateQuizSessionDto) => {
    set({ quizLoading: true, quizError: null });
    try {
      const session = await getQuizService().createSession(dto);
      set({ activeSession: session, quizLoading: false });
      return session;
    } catch (error) {
      set({
        quizError:
          error instanceof Error
            ? error.message
            : "Failed to create quiz session",
        quizLoading: false,
      });
      throw error;
    }
  },

  // Load active session (resume incomplete quiz)
  loadActiveSession: async () => {
    set({ quizLoading: true, quizError: null });
    try {
      const session = await getQuizService().getActiveSession();
      set({ activeSession: session, quizLoading: false });
    } catch (error) {
      set({
        quizError:
          error instanceof Error ? error.message : "Failed to load quiz",
        quizLoading: false,
      });
      throw error;
    }
  },

  // Submit an answer
  submitAnswer: async (result: QuizResult) => {
    const session = get().activeSession;
    if (!session) {
      throw new Error("No active quiz session");
    }

    set({ quizError: null });
    try {
      const updatedSession = await getQuizService().submitAnswer(session.id, result);

      // Try to update progress for the question
      try {
        await getProgressService().update(result.questionId, {
          wasCorrect: result.wasCorrect,
          confidenceLevel: result.confidenceRating,
        });
      } catch (progressError) {
        console.warn("Failed to update progress:", progressError);
        // Progress update failed, but quiz answer was submitted successfully
        // The progress record might not exist yet - it will be created later
      }

      set({ activeSession: updatedSession });
    } catch (error) {
      set({
        quizError:
          error instanceof Error ? error.message : "Failed to submit answer",
      });
      throw error;
    }
  },

  // Complete the quiz
  completeQuiz: async () => {
    const session = get().activeSession;
    if (!session) {
      throw new Error("No active quiz session");
    }

    set({ quizError: null });
    try {
      const completedSession = await getQuizService().completeSession(session.id);
      set({ activeSession: null });

      // Refresh quiz history
      await get().fetchQuizHistory(10);

      return completedSession;
    } catch (error) {
      set({
        quizError:
          error instanceof Error ? error.message : "Failed to complete quiz",
      });
      throw error;
    }
  },

  // Fetch quiz history
  fetchQuizHistory: async (limit?: number) => {
    set({ quizLoading: true, quizError: null });
    try {
      const history = await getQuizService().getHistory(limit);
      set({ quizHistory: history, quizLoading: false });
    } catch (error) {
      set({
        quizError:
          error instanceof Error
            ? error.message
            : "Failed to fetch quiz history",
        quizLoading: false,
      });
      throw error;
    }
  },

  // Clear active session (without completing)
  clearActiveSession: () => {
    set({ activeSession: null });
  },

  // Get current question
  getCurrentQuestion: (questions: Question[]) => {
    const session = get().activeSession;
    if (!session || !questions.length) return null;

    const currentQuestionId = session.questionIds[session.currentIndex];
    return questions.find((q) => q.id === currentQuestionId) || null;
  },

  // Get quiz progress
  getQuizProgress: () => {
    const session = get().activeSession;
    if (!session) {
      return { current: 0, total: 0 };
    }

    return {
      current: session.currentIndex + 1,
      total: session.questionIds.length,
    };
  },

  // Check if quiz is completed
  isQuizCompleted: () => {
    const session = get().activeSession;
    return session ? !!session.completedAt : false;
  },
});

