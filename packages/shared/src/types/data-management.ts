export interface QuestionImportDetail {
  questionId: string;
  questionNumber: number;
  question: string;
}

export interface TopicImportDetail {
  topicId: string;
  topicName: string;
  questionsCount: number;
  questions: QuestionImportDetail[];
}

export interface ImportResult {
  success: boolean;
  topicsImported: number;
  questionsImported: number;
  message: string;
  errors: string[];
  topicsDetails: TopicImportDetail[];
}

export interface DatabaseStats {
  topicsCount: number;
  questionsCount: number;
  databaseSize: number;
}

export interface ExportResult {
  success: boolean;
  message: string;
  exportedPath?: string;
}

export interface GenericImportResult {
  success: boolean;
  message: string;
  topicsCount: number;
  questionsCount: number;
  progressCount: number;
  quizSessionsCount: number;
}
