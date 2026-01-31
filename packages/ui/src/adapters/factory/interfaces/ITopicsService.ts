import type { Topic, CreateTopicDto, UpdateTopicDto } from "@code-notes/shared";

export interface ITopicsService {
  getAll(): Promise<Topic[]>;
  getById(id: string): Promise<Topic | null>;
  create(dto: CreateTopicDto): Promise<string>;
  update(id: string, dto: UpdateTopicDto): Promise<boolean>;
  delete(id: string): Promise<boolean>;
}
