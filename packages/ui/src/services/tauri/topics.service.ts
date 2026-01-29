import { invoke } from "@tauri-apps/api/core";
import type { Topic, CreateTopicDto, UpdateTopicDto } from "@code-notes/shared";

export const topicsService = {
  getAll: async (): Promise<Topic[]> => {
    return await invoke<Topic[]>("get_topics");
  },

  getById: async (id: string): Promise<Topic | null> => {
    return await invoke<Topic | null>("get_topic_by_id", { id });
  },

  create: async (dto: CreateTopicDto): Promise<string> => {
    return await invoke<string>("create_topic", { dto });
  },

  update: async (id: string, dto: UpdateTopicDto): Promise<boolean> => {
    return await invoke<boolean>("update_topic", { id, dto });
  },

  delete: async (id: string): Promise<boolean> => {
    return await invoke<boolean>("delete_topic", { id });
  },
};
