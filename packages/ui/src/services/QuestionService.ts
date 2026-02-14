import { getQuestionsService } from "../adapters/factory";
import type {
  Question,
  CreateQuestionDto,
  UpdateQuestionDto,
} from "@code-notes/shared";

/**
 * Get all questions
 */
export const getAll = (): Promise<Question[]> => {
  return getQuestionsService().getAll();
};

/**
 * Get question by ID
 */
export const getById = (id: string): Promise<Question | null> => {
  return getQuestionsService().getById(id);
};

/**
 * Get all questions for a topic
 */
export const getByTopicId = (topicId: string): Promise<Question[]> => {
  return getQuestionsService().getByTopicId(topicId);
};

/**
 * Create a new question
 * @returns The ID of the created question
 */
export const create = (dto: CreateQuestionDto): Promise<string> => {
  return getQuestionsService().create(dto);
};

/**
 * Update a question
 * @returns True if successful, false otherwise
 */
export const update = (
  id: string,
  dto: UpdateQuestionDto,
): Promise<boolean> => {
  return getQuestionsService().update(id, dto);
};

/**
 * Delete a question
 * @returns True if successful, false otherwise
 */
export const remove = (id: string): Promise<boolean> => {
  return getQuestionsService().delete(id);
};
