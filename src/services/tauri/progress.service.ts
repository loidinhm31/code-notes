import { invoke } from "@tauri-apps/api/core";
import type {
  QuestionProgress,
  UpdateProgressDto,
  ProgressStatistics,
} from "@/types";

export const progressService = {
  getAll: async (): Promise<QuestionProgress[]> => {
    return await invoke<QuestionProgress[]>("get_all_progress");
  },

  getByQuestion: async (
    questionId: string,
  ): Promise<QuestionProgress | null> => {
    return await invoke<QuestionProgress | null>("get_progress_by_question", {
      questionId,
    });
  },

  getByTopic: async (topicId: string): Promise<QuestionProgress[]> => {
    return await invoke<QuestionProgress[]>("get_progress_by_topic", {
      topicId,
    });
  },

  update: async (
    questionId: string,
    dto: UpdateProgressDto,
  ): Promise<QuestionProgress> => {
    return await invoke<QuestionProgress>("update_question_progress", {
      questionId,
      dto,
    });
  },

  reset: async (questionId: string): Promise<boolean> => {
    return await invoke<boolean>("reset_question_progress", { questionId });
  },

  getStatistics: async (): Promise<ProgressStatistics> => {
    return await invoke<ProgressStatistics>("get_progress_statistics");
  },

  getDueForReview: async (): Promise<QuestionProgress[]> => {
    return await invoke<QuestionProgress[]>("get_questions_due_for_review");
  },

  ensureForAllQuestions: async (): Promise<number> => {
    return await invoke<number>("ensure_progress_for_all_questions");
  },
};
