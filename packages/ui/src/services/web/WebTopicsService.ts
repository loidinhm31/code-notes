import { db } from "./DexieDB";
import type { ITopicsService } from "../interfaces";
import type { Topic, CreateTopicDto, UpdateTopicDto } from "@code-notes/shared";
import { v4 as uuidv4 } from "uuid";

export class WebTopicsService implements ITopicsService {
    async getAll(): Promise<Topic[]> {
        return await db.topics.toArray();
    }

    async getById(id: string): Promise<Topic | null> {
        return (await db.topics.get(id)) || null;
    }

    async create(dto: CreateTopicDto): Promise<string> {
        const id = uuidv4();
        const now = new Date().toISOString();
        const topic: Topic = {
            id,
            name: dto.name,
            description: dto.description,
            slug: dto.slug || dto.name.toLowerCase().replace(/ /g, "-"),
            icon: dto.icon || "default-icon", // default if needed
            color: dto.color || "#000000",
            subtopics: dto.subtopics || [],
            order: dto.order || 0,
            createdAt: now,
            updatedAt: now,
        };
        await db.topics.add(topic);
        return id;
    }

    async update(id: string, dto: UpdateTopicDto): Promise<boolean> {
        const topic = await db.topics.get(id);
        if (!topic) return false;

        const updates: Partial<Topic> = {
            ...dto,
            updatedAt: new Date().toISOString(),
        };
        await db.topics.update(id, updates);
        return true;
    }

    async delete(id: string): Promise<boolean> {
        // Also delete related questions
        await db.questions.where("topicId").equals(id).delete();
        await db.topics.delete(id);
        return true;
    }
}
