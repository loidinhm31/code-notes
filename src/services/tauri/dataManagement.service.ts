import { invoke } from "@tauri-apps/api/core";

export interface ExportResult {
  success: boolean;
  message: string;
  exported_path?: string;
}

export interface ImportResult {
  success: boolean;
  message: string;
  topics_count: number;
  questions_count: number;
  progress_count: number;
  quiz_sessions_count: number;
}

export interface DatabaseStats {
  topics_count: number;
  questions_count: number;
  database_size: number;
}

export class DataManagementService {
  static async exportDatabase(exportPath: string): Promise<ExportResult> {
    return invoke<ExportResult>("export_database", { exportPath });
  }

  static async importDatabase(
    importContent: string,
    merge: boolean,
  ): Promise<ImportResult> {
    return invoke<ImportResult>("import_database", { importContent, merge });
  }

  static async getDatabaseStats(): Promise<DatabaseStats> {
    return invoke<DatabaseStats>("get_database_stats");
  }
}
