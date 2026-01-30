import { db, trackDelete } from "./database";
import type { ITopicsService } from "../interfaces";
import type { Topic, CreateTopicDto, UpdateTopicDto } from "@code-notes/shared";
import { v4 as uuidv4 } from "uuid";

export class WebTopicsAdapter implements ITopicsService {
  async getAll(): Promise<Topic[]> {
    return await db.topics.toArray();
  }

  async getById(id: string): Promise<Topic | null> {
    return (await db.topics.get(id)) || null;
  }

  async create(dto: CreateTopicDto): Promise<string> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const topic: any = {
      id,
      name: dto.name,
      description: dto.description,
      slug: dto.slug || dto.name.toLowerCase().replace(/ /g, "-"),
      icon: dto.icon || "default-icon",
      color: dto.color || "#000000",
      subtopics: dto.subtopics || [],
      order: dto.order || 0,
      createdAt: now,
      updatedAt: now,
      sync_version: 1,
      synced_at: undefined,
    };
    await db.topics.add(topic);
    return id;
  }

  async update(id: string, dto: UpdateTopicDto): Promise<boolean> {
    const topic = await db.topics.get(id);
    if (!topic) return false;

    const updates: any = {
      ...dto,
      updatedAt: new Date().toISOString(),
      sync_version: ((topic as any).sync_version || 0) + 1,
      synced_at: undefined,
    };
    await db.topics.update(id, updates);
    return true;
  }

  async delete(id: string): Promise<boolean> {
    await db.transaction(
      "rw",
      [db.topics, db.questions, db.progress, db._pendingChanges],
      async () => {
        // Track child deletes first
        const questions = await db.questions
          .where("topicId")
          .equals(id)
          .toArray();
        for (const q of questions) {
          // Track progress deletes
          const progress = await db.progress.get(q.id);
          if (progress) {
            await trackDelete(
              "progress",
              q.id,
              (progress as any).sync_version || 0,
            );
          }
          await db.progress.delete(q.id);
          await trackDelete("questions", q.id, (q as any).sync_version || 0);
        }
        await db.questions.where("topicId").equals(id).delete();

        // Track parent delete
        const topic = await db.topics.get(id);
        if (topic) {
          await trackDelete("topics", id, (topic as any).sync_version || 0);
        }
        await db.topics.delete(id);
      },
    );
    return true;
  }
}
