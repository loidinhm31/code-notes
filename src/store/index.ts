import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { createTopicsSlice, TopicsSlice } from "./slices/topicsSlice";
import { createQuestionsSlice, QuestionsSlice } from "./slices/questionsSlice";
import { createUISlice, UISlice } from "./slices/uiSlice";

// Combined store type
type StoreState = TopicsSlice & QuestionsSlice & UISlice;

export const useStore = create<StoreState>()(
  devtools(
    persist(
      (...a) => ({
        ...createTopicsSlice(...a),
        ...createQuestionsSlice(...a),
        ...createUISlice(...a),
      }),
      {
        name: "ya-tua-storage",
        // Only persist non-sensitive, cacheable data
        partialize: (state) => ({
          topics: state.topics,
          questions: state.questions,
          sidebarOpen: state.sidebarOpen,
          fontSize: state.fontSize,
        }),
      },
    ),
  ),
);

// Export types
export type { StoreState };
