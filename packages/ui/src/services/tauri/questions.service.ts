import { invoke } from "@tauri-apps/api/core";
import type { Question, CreateQuestionDto, UpdateQuestionDto } from "@code-notes/shared";

export const questionsService = {
  getAll: async (): Promise<Question[]> => {
    return await invoke<Question[]>("get_questions");
  },

  getById: async (id: string): Promise<Question | null> => {
    return await invoke<Question | null>("get_question_by_id", { id });
  },

  getByTopicId: async (topicId: string): Promise<Question[]> => {
    return await invoke<Question[]>("get_questions_by_topic", { topicId });
  },

  create: async (dto: CreateQuestionDto): Promise<string> => {
    return await invoke<string>("create_question", { dto });
  },

  update: async (id: string, dto: UpdateQuestionDto): Promise<boolean> => {
    return await invoke<boolean>("update_question", { id, dto });
  },

  delete: async (id: string): Promise<boolean> => {
    return await invoke<boolean>("delete_question", { id });
  },
};


