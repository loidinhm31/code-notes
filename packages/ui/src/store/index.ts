import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { createTopicsSlice, TopicsSlice } from "./slices/topicsSlice";
import { createQuestionsSlice, QuestionsSlice } from "./slices/questionsSlice";
import { createUISlice, UISlice } from "./slices/uiSlice";
import { createProgressSlice, ProgressSlice } from "./slices/progressSlice";
import { createQuizSlice, QuizSlice } from "./slices/quizSlice";
import { createSearchSlice, SearchSlice } from "./slices/searchSlice";

// Combined store type
type StoreState = TopicsSlice &
  QuestionsSlice &
  UISlice &
  ProgressSlice &
  QuizSlice &
  SearchSlice;

export const useStore = create<StoreState>()(
  devtools(
    persist(
      (...a) => ({
        ...createTopicsSlice(...a),
        ...createQuestionsSlice(...a),
        ...createUISlice(...a),
        ...createProgressSlice(...a),
        ...createQuizSlice(...a),
        ...createSearchSlice(...a),
      }),
      {
        name: "code-notes-storage",
        // Only persist non-sensitive, cacheable data
        partialize: (state) => ({
          topics: state.topics,
          questions: state.questions,
          sidebarOpen: state.sidebarOpen,
          fontSize: state.fontSize,
          // Note: Don't persist progressMap (Map object, fetched fresh from backend)
          // Note: Don't persist activeSession (ephemeral)
          // Note: Search state is ephemeral — searchQuery, searchResults, searchIndex,
          //       _allQuestions, isSearching, filters intentionally excluded
        }),
      },
    ),
  ),
);

// Export types
export type { StoreState };
