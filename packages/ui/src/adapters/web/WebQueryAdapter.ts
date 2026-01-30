import type { IQueryService } from "../interfaces";
import type { Question, Topic, TopicStats } from "@code-notes/shared";
import { db } from "./database";

export class WebQueryAdapter implements IQueryService {
  async queryDatabase(query: string): Promise<string> {
    // Simple query implementation for web
    // Supports basic table queries: .topics, .questions
    const trimmed = query.trim().toLowerCase();

    if (trimmed === ".topics" || trimmed === "topics") {
      const topics = await db.topics.toArray();
      return JSON.stringify(topics, null, 2);
    }

    if (trimmed === ".questions" || trimmed === "questions") {
      const questions = await db.questions.toArray();
      return JSON.stringify(questions, null, 2);
    }

    if (trimmed === ".progress" || trimmed === "progress") {
      const progress = await db.progress.toArray();
      return JSON.stringify(progress, null, 2);
    }

    // Default: return all data
    const topics = await db.topics.toArray();
    const questions = await db.questions.toArray();
    return JSON.stringify({ topics, questions }, null, 2);
  }

  async searchQuestions(keyword: string): Promise<Question[]> {
    const lowerKeyword = keyword.toLowerCase();
    const allQuestions = await db.questions.toArray();
    return allQuestions.filter(
      (q) =>
        q.question.toLowerCase().includes(lowerKeyword) ||
        q.answer.markdown.toLowerCase().includes(lowerKeyword) ||
        q.tags.some((t) => t.toLowerCase().includes(lowerKeyword)),
    );
  }

  async searchTopics(keyword: string): Promise<Topic[]> {
    const lowerKeyword = keyword.toLowerCase();
    const allTopics = await db.topics.toArray();
    return allTopics.filter(
      (t) =>
        t.name.toLowerCase().includes(lowerKeyword) ||
        t.description.toLowerCase().includes(lowerKeyword),
    );
  }

  async getTopicStats(): Promise<TopicStats[]> {
    const topics = await db.topics.toArray();
    const stats: TopicStats[] = [];

    for (const topic of topics) {
      const questionCount = await db.questions
        .where("topicId")
        .equals(topic.id)
        .count();
      stats.push({
        id: topic.id,
        name: topic.name,
        question_count: questionCount,
      });
    }

    return stats;
  }
}
