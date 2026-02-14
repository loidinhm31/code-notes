import { db, trackDelete } from "./database";
import type { IQuestionsService } from "@code-notes/ui/adapters/factory/interfaces";
import type {
  Question,
  CreateQuestionDto,
  UpdateQuestionDto,
} from "@code-notes/shared";
import { v4 as uuidv4 } from "uuid";

export class WebQuestionsAdapter implements IQuestionsService {
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

    const count = await db.questions
      .where("topicId")
      .equals(dto.topicId)
      .count();

    const question: Question = {
      id,
      topicId: dto.topicId,
      questionNumber: dto.questionNumber || count + 1,
      question: dto.question,
      answer: dto.answer,
      tags: dto.tags || [],
      difficulty: dto.difficulty || "beginner",
      order: dto.order || 0,
      subtopic: dto.subtopic,
      createdAt: now,
      updatedAt: now,
      syncVersion: 1,
      syncedAt: undefined,
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
      syncVersion: (question.syncVersion || 0) + 1,
      syncedAt: undefined,
    };
    await db.questions.update(id, updates);
    return true;
  }

  async delete(id: string): Promise<boolean> {
    await db.transaction(
      "rw",
      [db.questions, db.progress, db._pendingChanges],
      async () => {
        // Track progress delete
        const progress = await db.progress.get(id);
        if (progress) {
          await trackDelete("progress", id, progress.syncVersion || 0);
        }
        await db.progress.delete(id);

        // Track question delete
        const question = await db.questions.get(id);
        if (question) {
          await trackDelete("questions", id, question.syncVersion || 0);
        }
        await db.questions.delete(id);
      },
    );
    return true;
  }
}
