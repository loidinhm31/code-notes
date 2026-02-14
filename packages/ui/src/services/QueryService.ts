import { getQueryService } from "../adapters/factory";
import type { Question, Topic, TopicStats } from "@code-notes/shared";

/**
 * Execute a database query
 * @param query SQL query string
 * @returns Query result as string
 */
export const queryDatabase = (query: string): Promise<string> => {
  return getQueryService().queryDatabase(query);
};

/**
 * Search questions by keyword
 */
export const searchQuestions = (keyword: string): Promise<Question[]> => {
  return getQueryService().searchQuestions(keyword);
};

/**
 * Search topics by keyword
 */
export const searchTopics = (keyword: string): Promise<Topic[]> => {
  return getQueryService().searchTopics(keyword);
};

/**
 * Get statistics for all topics
 */
export const getTopicStats = (): Promise<TopicStats[]> => {
  return getQueryService().getTopicStats();
};
