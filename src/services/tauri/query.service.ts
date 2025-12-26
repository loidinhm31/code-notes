import { invoke } from "@tauri-apps/api/core";
import type { Question, Topic } from "@/types";

export interface TopicStats {
  id: string;
  name: string;
  question_count: number;
}

export const queryService = {
  /**
   * Execute a raw jql query against the database (uses jql library)
   * Examples:
   * - '.questions' - Get all questions
   * - '.topics' - Get all topics
   * - '.questions[0]' - Get first question
   * - '.topics[0].name' - Get first topic's name
   * - '.questions[0:5]' - First 5 questions
   *
   * Returns raw JSON string that needs to be parsed
   */
  queryDatabase: async (query: string): Promise<string> => {
    return await invoke<string>("query_database", { query });
  },

  /**
   * Search questions by keyword
   */
  searchQuestions: async (keyword: string): Promise<Question[]> => {
    return await invoke<Question[]>("search_questions", { keyword });
  },

  /**
   * Search topics by keyword
   */
  searchTopics: async (keyword: string): Promise<Topic[]> => {
    return await invoke<Topic[]>("search_topics", { keyword });
  },

  /**
   * Get statistics for all topics (includes question count)
   */
  getTopicStats: async (): Promise<TopicStats[]> => {
    return await invoke<TopicStats[]>("get_topic_stats");
  },
};
