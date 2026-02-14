import { getTopicsService } from "../adapters/factory";
import type { Topic, CreateTopicDto, UpdateTopicDto } from "@code-notes/shared";

/**
 * Get all topics
 */
export const getAll = (): Promise<Topic[]> => {
  return getTopicsService().getAll();
};

/**
 * Get topic by ID
 */
export const getById = (id: string): Promise<Topic | null> => {
  return getTopicsService().getById(id);
};

/**
 * Create a new topic
 * @returns The ID of the created topic
 */
export const create = (dto: CreateTopicDto): Promise<string> => {
  return getTopicsService().create(dto);
};

/**
 * Update a topic
 * @returns True if successful, false otherwise
 */
export const update = (id: string, dto: UpdateTopicDto): Promise<boolean> => {
  return getTopicsService().update(id, dto);
};

/**
 * Delete a topic
 * @returns True if successful, false otherwise
 */
export const remove = (id: string): Promise<boolean> => {
  return getTopicsService().delete(id);
};
