import type {
  QuestionProgress,
  UpdateProgressDto,
  ProgressStatistics,
} from "@code-notes/shared";

export interface IProgressService {
  getAll(): Promise<QuestionProgress[]>;
  getByQuestion(questionId: string): Promise<QuestionProgress | null>;
  getByTopic(topicId: string): Promise<QuestionProgress[]>;
  update(questionId: string, dto: UpdateProgressDto): Promise<QuestionProgress>;
  reset(questionId: string): Promise<boolean>;
  getStatistics(): Promise<ProgressStatistics>;
  getDueForReview(): Promise<QuestionProgress[]>;
  ensureForAllQuestions(): Promise<number>;
}
