import { invoke } from "@tauri-apps/api/core";

export const debugService = {
  debugDatabase: async (): Promise<string> => {
    return await invoke<string>("debug_database");
  },

  debugTopicQuestions: async (topicId: string): Promise<string> => {
    return await invoke<string>("debug_topic_questions", { topicId });
  },
};
