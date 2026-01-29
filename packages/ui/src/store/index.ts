import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { createTopicsSlice, TopicsSlice } from "./slices/topicsSlice";
import { createQuestionsSlice, QuestionsSlice } from "./slices/questionsSlice";
import { createUISlice, UISlice } from "./slices/uiSlice";
import { createProgressSlice, ProgressSlice } from "./slices/progressSlice";
import { createQuizSlice, QuizSlice } from "./slices/quizSlice";

// Combined store type
type StoreState = TopicsSlice &
  QuestionsSlice &
  UISlice &
  ProgressSlice &
  QuizSlice;

export const useStore = create<StoreState>()(
  devtools(
    persist(
      (...a) => ({
        ...createTopicsSlice(...a),
        ...createQuestionsSlice(...a),
        ...createUISlice(...a),
        ...createProgressSlice(...a),
        ...createQuizSlice(...a),
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
        }),
      },
    ),
  ),
);

// Export types
export type { StoreState };
