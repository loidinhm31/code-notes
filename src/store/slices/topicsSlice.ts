import { StateCreator } from "zustand";
import { topicsService, queryService } from "@/services/tauri";
import type { Topic, CreateTopicDto, UpdateTopicDto } from "@/types";

export interface TopicsSlice {
  topics: Topic[];
  topicsSearchResults: Topic[];
  isSearchingTopics: boolean;
  searchKeyword: string | null;
  loading: boolean;
  error: string | null;
  fetchTopics: () => Promise<void>;
  getTopicById: (id: string) => Promise<Topic | null>;
  addTopic: (dto: CreateTopicDto) => Promise<string>;
  updateTopic: (id: string, dto: UpdateTopicDto) => Promise<boolean>;
  deleteTopic: (id: string) => Promise<boolean>;
  searchTopics: (keyword: string) => Promise<void>;
  clearTopicsSearch: () => void;
}

export const createTopicsSlice: StateCreator<TopicsSlice> = (set, get) => ({
  topics: [],
  topicsSearchResults: [],
  isSearchingTopics: false,
  searchKeyword: null,
  loading: false,
  error: null,

  fetchTopics: async () => {
    set({ loading: true, error: null });
    try {
      const topics = await topicsService.getAll();
      set({ topics, loading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to fetch topics",
        loading: false,
      });
      throw error;
    }
  },

  getTopicById: async (id: string) => {
    try {
      return await topicsService.getById(id);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to get topic",
      });
      throw error;
    }
  },

  addTopic: async (dto: CreateTopicDto) => {
    set({ error: null });
    try {
      const id = await topicsService.create(dto);
      // Refresh topics after creation
      await get().fetchTopics();
      return id;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to create topic",
      });
      throw error;
    }
  },

  updateTopic: async (id: string, dto: UpdateTopicDto) => {
    set({ error: null });
    try {
      const success = await topicsService.update(id, dto);
      if (success) {
        // Refresh topics after update
        await get().fetchTopics();
      }
      return success;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to update topic",
      });
      throw error;
    }
  },

  deleteTopic: async (id: string) => {
    set({ error: null });
    try {
      const success = await topicsService.delete(id);
      if (success) {
        // Remove from local state
        set({ topics: get().topics.filter((t) => t.id !== id) });
      }
      return success;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to delete topic",
      });
      throw error;
    }
  },

  searchTopics: async (keyword: string) => {
    set({ isSearchingTopics: true, searchKeyword: keyword, error: null });
    try {
      const results = await queryService.searchTopics(keyword);
      set({ topicsSearchResults: results, isSearchingTopics: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to search topics",
        isSearchingTopics: false,
      });
      throw error;
    }
  },

  clearTopicsSearch: () => {
    set({
      topicsSearchResults: [],
      searchKeyword: null,
      isSearchingTopics: false,
    });
  },
});
