import { getProgressService } from "../adapters/factory";
import type {
  QuestionProgress,
  UpdateProgressDto,
  ProgressStatistics,
} from "@code-notes/shared";

/**
 * Get all progress records
 */
export const getAll = (): Promise<QuestionProgress[]> => {
  return getProgressService().getAll();
};

/**
 * Get progress for a specific question
 */
export const getByQuestion = (
  questionId: string,
): Promise<QuestionProgress | null> => {
  return getProgressService().getByQuestion(questionId);
};

/**
 * Get progress for all questions in a topic
 */
export const getByTopic = (topicId: string): Promise<QuestionProgress[]> => {
  return getProgressService().getByTopic(topicId);
};

/**
 * Update progress for a question
 */
export const update = (
  questionId: string,
  dto: UpdateProgressDto,
): Promise<QuestionProgress> => {
  return getProgressService().update(questionId, dto);
};

/**
 * Reset progress for a question
 * @returns True if successful, false otherwise
 */
export const reset = (questionId: string): Promise<boolean> => {
  return getProgressService().reset(questionId);
};

/**
 * Get overall learning statistics
 */
export const getStatistics = (): Promise<ProgressStatistics> => {
  return getProgressService().getStatistics();
};

/**
 * Get questions that are due for review
 */
export const getDueForReview = (): Promise<QuestionProgress[]> => {
  return getProgressService().getDueForReview();
};

/**
 * Ensure progress records exist for all questions
 * @returns Number of records created
 */
export const ensureForAllQuestions = (): Promise<number> => {
  return getProgressService().ensureForAllQuestions();
};
