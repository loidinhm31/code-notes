import type {
  Topic,
  CreateTopicDto,
  UpdateTopicDto,
  Question,
  CreateQuestionDto,
  UpdateQuestionDto,
  QuizSession,
  CreateQuizSessionDto,
  QuizResult,
  TopicStats,
  QuestionProgress,
  UpdateProgressDto,
  ProgressStatistics,
} from "@code-notes/shared";

export interface ITopicsService {
  getAll(): Promise<Topic[]>;
  getById(id: string): Promise<Topic | null>;
  create(dto: CreateTopicDto): Promise<string>;
  update(id: string, dto: UpdateTopicDto): Promise<boolean>;
  delete(id: string): Promise<boolean>;
}

export interface IQuestionsService {
  getAll(): Promise<Question[]>;
  getById(id: string): Promise<Question | null>;
  getByTopicId(topicId: string): Promise<Question[]>;
  create(dto: CreateQuestionDto): Promise<string>;
  update(id: string, dto: UpdateQuestionDto): Promise<boolean>;
  delete(id: string): Promise<boolean>;
}

export interface IQueryService {
  queryDatabase(query: string): Promise<string>;
  searchQuestions(keyword: string): Promise<Question[]>;
  searchTopics(keyword: string): Promise<Topic[]>;
  getTopicStats(): Promise<TopicStats[]>;
}

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

export interface IQuizService {
  createSession(dto: CreateQuizSessionDto): Promise<QuizSession>;
  getSession(sessionId: string): Promise<QuizSession | null>;
  getActiveSession(): Promise<QuizSession | null>;
  submitAnswer(sessionId: string, result: QuizResult): Promise<QuizSession>;
  completeSession(sessionId: string): Promise<QuizSession>;
  getHistory(limit?: number): Promise<QuizSession[]>;
}

export interface IFileSystemService {
  importData(data: string): Promise<boolean>;
  exportData(): Promise<string>;
}

export interface QuestionImportDetail {
  question_id: string;
  question_number: number;
  question: string;
}

export interface TopicImportDetail {
  topic_id: string;
  topic_name: string;
  questions_count: number;
  questions: QuestionImportDetail[];
}

export interface ImportResult {
  success: boolean;
  topics_imported: number;
  questions_imported: number;
  message: string;
  errors: string[];
  topics_details: TopicImportDetail[];
}

export interface DatabaseStats {
  topics_count: number;
  questions_count: number;
  database_size: number;
}

export interface ExportResult {
  success: boolean;
  message: string;
  exported_path?: string;
}

export interface GenericImportResult {
  success: boolean;
  message: string;
  topics_count: number;
  questions_count: number;
  progress_count: number;
  quiz_sessions_count: number;
}

export interface IDataManagementService {
  getDatabaseStats(): Promise<DatabaseStats>;
  exportDatabase(path?: string): Promise<ExportResult>;
  importDatabase(content: string, merge: boolean): Promise<GenericImportResult>;
}
