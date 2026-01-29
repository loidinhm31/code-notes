import { db } from "./DexieDB";
import type { IQuestionsService } from "../interfaces";
import type {
  Question,
  CreateQuestionDto,
  UpdateQuestionDto,
} from "@code-notes/shared";
import { v4 as uuidv4 } from "uuid";

export class WebQuestionsService implements IQuestionsService {
  async getAll(): Promise<Question[]> {
    return await db.questions.toArray();
  }

  async getById(id: string): Promise<Question | null> {
    return (await db.questions.get(id)) || null;
  }

  async getByTopicId(topicId: string): Promise<Question[]> {
    return await db.questions.where("topicId").equals(topicId).toArray();
  }

  async create(dto: CreateQuestionDto): Promise<string> {
    const id = uuidv4();
    const now = new Date().toISOString();

    // Find next question number if not provided (simple approach)
    // In a real app we might query max + 1
    const count = await db.questions
      .where("topicId")
      .equals(dto.topicId)
      .count();

    // Ensure defaults for missing fields from DTO (if any)
    const question: Question = {
      id,
      topicId: dto.topicId,
      questionNumber: dto.questionNumber || count + 1,
      question: dto.question,
      answer: dto.answer, // Object { markdown: string }
      tags: dto.tags || [],
      difficulty: dto.difficulty || "beginner",
      order: dto.order || 0,
      subtopic: dto.subtopic,
      createdAt: now,
      updatedAt: now,
    };
    await db.questions.add(question);
    return id;
  }

  async update(id: string, dto: UpdateQuestionDto): Promise<boolean> {
    const question = await db.questions.get(id);
    if (!question) return false;

    const updates: Partial<Question> = {
      ...dto,
      updatedAt: new Date().toISOString(),
    };
    await db.questions.update(id, updates);
    return true;
  }

  async delete(id: string): Promise<boolean> {
    // Also delete progress
    await db.progress.delete(id);
    await db.questions.delete(id);
    return true;
  }
}
