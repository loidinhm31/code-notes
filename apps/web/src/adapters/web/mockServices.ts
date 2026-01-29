import {
  ITopicsService,
  IQuestionsService,
  IQueryService,
  IProgressService,
  IQuizService,
} from "@code-notes/ui/services";

// TODO: Implement Real IndexedDB Adapters
export const mockTopicsService: ITopicsService = {
  getAll: async () => [],
  getById: async () => null,
  create: async () => "1",
  update: async () => true,
  delete: async () => true,
};

export const mockQuestionsService: IQuestionsService = {
  getAll: async () => [],
  getById: async () => null,
  getByTopicId: async () => [],
  create: async () => "1",
  update: async () => true,
  delete: async () => true,
};

export const mockQueryService: IQueryService = {
  queryDatabase: async () => "[]",
  searchQuestions: async () => [],
  searchTopics: async () => [],
  getTopicStats: async () => [],
};

export const mockProgressService: IProgressService = {
  getAll: async () => [],
  getByQuestion: async () => null,
  getByTopic: async () => [],
  update: async () => ({}) as any,
  reset: async () => true,
  getStatistics: async () => ({}) as any,
  getDueForReview: async () => [],
  ensureForAllQuestions: async () => 0,
};

export const mockQuizService: IQuizService = {
  createSession: async () => ({}) as any,
  getSession: async () => null,
  getActiveSession: async () => null,
  submitAnswer: async () => ({}) as any,
  completeSession: async () => ({}) as any,
  getHistory: async () => [],
};
