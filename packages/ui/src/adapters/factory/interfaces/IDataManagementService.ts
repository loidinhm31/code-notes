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
