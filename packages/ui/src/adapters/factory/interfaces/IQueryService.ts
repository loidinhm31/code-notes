import type { Question, Topic, TopicStats } from "@code-notes/shared";

export interface IQueryService {
  queryDatabase(query: string): Promise<string>;
  searchQuestions(keyword: string): Promise<Question[]>;
  searchTopics(keyword: string): Promise<Topic[]>;
  getTopicStats(): Promise<TopicStats[]>;
}
