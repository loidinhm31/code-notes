import { StateCreator } from "zustand";
import { getQuestionsService, getQueryService } from "@code-notes/ui/services";
import type {
  Question,
  CreateQuestionDto,
  UpdateQuestionDto,
} from "@code-notes/shared";

export interface QuestionFilters {
  keyword: string;
  tags?: string[];
  topicId?: string;
}

export interface QuestionsSlice {
  questions: Question[];
  questionsSearchResults: Question[];
  isSearchingQuestions: boolean;
  searchFilters: QuestionFilters | null;
  currentQuestion: Question | null;
  loading: boolean;
  error: string | null;
  fetchQuestions: () => Promise<void>;
  fetchQuestionsByTopic: (topicId: string) => Promise<void>;
  getQuestionById: (id: string) => Promise<Question | null>;
  setCurrentQuestion: (question: Question | null) => void;
  addQuestion: (dto: CreateQuestionDto) => Promise<string>;
  updateQuestion: (id: string, dto: UpdateQuestionDto) => Promise<boolean>;
  deleteQuestion: (id: string) => Promise<boolean>;
  searchQuestions: (
    keyword: string,
    filters?: Partial<QuestionFilters>,
  ) => Promise<void>;
  clearQuestionsSearch: () => void;
}

export const createQuestionsSlice: StateCreator<QuestionsSlice> = (
  set,
  get,
) => ({
  questions: [],
  questionsSearchResults: [],
  isSearchingQuestions: false,
  searchFilters: null,
  currentQuestion: null,
  loading: false,
  error: null,

  fetchQuestions: async () => {
    set({ loading: true, error: null });
    try {
      const questions = await getQuestionsService().getAll();
      set({ questions, loading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to fetch questions",
        loading: false,
      });
      throw error;
    }
  },

  fetchQuestionsByTopic: async (topicId: string) => {
    set({ loading: true, error: null });
    try {
      const questions = await getQuestionsService().getByTopicId(topicId);
      set({ questions, loading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to fetch questions",
        loading: false,
      });
      throw error;
    }
  },

  getQuestionById: async (id: string) => {
    try {
      const question = await getQuestionsService().getById(id);
      if (question) {
        set({ currentQuestion: question });
      }
      return question;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to get question",
      });
      throw error;
    }
  },

  setCurrentQuestion: (question: Question | null) => {
    set({ currentQuestion: question });
  },

  addQuestion: async (dto: CreateQuestionDto) => {
    set({ error: null });
    try {
      const id = await getQuestionsService().create(dto);
      // Refresh questions after creation
      await get().fetchQuestionsByTopic(dto.topicId);
      return id;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to create question",
      });
      throw error;
    }
  },

  updateQuestion: async (id: string, dto: UpdateQuestionDto) => {
    set({ error: null });
    try {
      const success = await getQuestionsService().update(id, dto);
      if (success && get().currentQuestion?.id === id) {
        // Refresh current question if it was updated
        await get().getQuestionById(id);
      }
      return success;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to update question",
      });
      throw error;
    }
  },

  deleteQuestion: async (id: string) => {
    set({ error: null });
    try {
      const success = await getQuestionsService().delete(id);
      if (success) {
        // Remove from local state
        set({ questions: get().questions.filter((q) => q.id !== id) });
        if (get().currentQuestion?.id === id) {
          set({ currentQuestion: null });
        }
      }
      return success;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to delete question",
      });
      throw error;
    }
  },

  searchQuestions: async (
    keyword: string,
    filters?: Partial<QuestionFilters>,
  ) => {
    set({ isSearchingQuestions: true, error: null });

    const searchFilters: QuestionFilters = {
      keyword,
      ...filters,
    };

    try {
      // Backend search by keyword
      let results = await getQueryService().searchQuestions(keyword);

      // Client-side filtering by tags
      if (filters?.tags && filters.tags.length > 0) {
        results = results.filter((q) =>
          filters.tags!.some((tag) => q.tags.includes(tag)),
        );
      }

      if (filters?.topicId) {
        results = results.filter((q) => q.topicId === filters.topicId);
      }

      set({
        questionsSearchResults: results,
        searchFilters,
        isSearchingQuestions: false,
      });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to search questions",
        isSearchingQuestions: false,
      });
      throw error;
    }
  },

  clearQuestionsSearch: () => {
    set({
      questionsSearchResults: [],
      searchFilters: null,
      isSearchingQuestions: false,
    });
  },
});
