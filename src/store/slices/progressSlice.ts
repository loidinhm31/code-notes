import { StateCreator } from "zustand";
import { progressService } from "@/services/tauri";
import type {
  QuestionProgress,
  UpdateProgressDto,
  ProgressStatistics,
  ProgressStatus,
} from "@/types";

export interface ProgressSlice {
  // State
  progressMap: Map<string, QuestionProgress>; // questionId -> progress
  progressLoading: boolean;
  progressError: string | null;
  statistics: ProgressStatistics | null;

  // Actions
  fetchAllProgress: () => Promise<void>;
  getQuestionProgress: (questionId: string) => QuestionProgress | undefined;
  updateProgress: (questionId: string, dto: UpdateProgressDto) => Promise<void>;
  resetProgress: (questionId: string) => Promise<void>;
  fetchStatistics: () => Promise<void>;

  // Computed/Helper methods
  getProgressByStatus: (status: ProgressStatus) => QuestionProgress[];
  getProgressStats: () => {
    notStudied: number;
    studying: number;
    mastered: number;
    needsReview: number;
    total: number;
  };
}

export const createProgressSlice: StateCreator<ProgressSlice> = (set, get) => ({
  // Initial state
  progressMap: new Map(),
  progressLoading: false,
  progressError: null,
  statistics: null,

  // Fetch all progress
  fetchAllProgress: async () => {
    set({ progressLoading: true, progressError: null });
    try {
      const progressArray = await progressService.getAll();
      const progressMap = new Map(progressArray.map((p) => [p.questionId, p]));
      set({ progressMap, progressLoading: false });
    } catch (error) {
      set({
        progressError:
          error instanceof Error ? error.message : "Failed to fetch progress",
        progressLoading: false,
      });
      throw error;
    }
  },

  // Get progress for a specific question
  getQuestionProgress: (questionId: string) => {
    return get().progressMap.get(questionId);
  },

  // Update progress for a question
  updateProgress: async (questionId: string, dto: UpdateProgressDto) => {
    set({ progressError: null });
    try {
      const updated = await progressService.update(questionId, dto);

      // Update local state
      const progressMap = new Map(get().progressMap);
      progressMap.set(questionId, updated);
      set({ progressMap });

      // Refresh statistics
      await get().fetchStatistics();
    } catch (error) {
      set({
        progressError:
          error instanceof Error ? error.message : "Failed to update progress",
      });
      throw error;
    }
  },

  // Reset progress for a question
  resetProgress: async (questionId: string) => {
    set({ progressError: null });
    try {
      await progressService.reset(questionId);

      // Refresh progress data
      await get().fetchAllProgress();
      await get().fetchStatistics();
    } catch (error) {
      set({
        progressError:
          error instanceof Error ? error.message : "Failed to reset progress",
      });
      throw error;
    }
  },

  // Fetch statistics
  fetchStatistics: async () => {
    try {
      const statistics = await progressService.getStatistics();
      set({ statistics });
    } catch (error) {
      set({
        progressError:
          error instanceof Error ? error.message : "Failed to fetch statistics",
      });
      throw error;
    }
  },

  // Get progress by status (helper)
  getProgressByStatus: (status: ProgressStatus) => {
    return Array.from(get().progressMap.values()).filter(
      (p) => p.status === status,
    );
  },

  // Get progress stats (helper)
  getProgressStats: () => {
    const progressArray = Array.from(get().progressMap.values());
    return {
      notStudied: progressArray.filter((p) => p.status === "NotStudied").length,
      studying: progressArray.filter((p) => p.status === "Studying").length,
      mastered: progressArray.filter((p) => p.status === "Mastered").length,
      needsReview: progressArray.filter((p) => p.status === "NeedsReview")
        .length,
      total: progressArray.length,
    };
  },
});
