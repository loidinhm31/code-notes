import { invoke } from "@tauri-apps/api/core";

export interface QuestionImportDetail {
  question_id: string;
  question_number: number;
  question: string;
}

export interface TopicImportDetail {
  topic_id: string;
  topic_name: string;
  questions_count: number;
  questions: QuestionImportDetail[];
}

export interface ImportResult {
  success: boolean;
  topics_imported: number;
  questions_imported: number;
  message: string;
  errors: string[];
  topics_details: TopicImportDetail[];
}

export const importService = {
  importFromMarkdown: async (content: string): Promise<ImportResult> => {
    return await invoke<ImportResult>("import_from_markdown", { content });
  },
};
