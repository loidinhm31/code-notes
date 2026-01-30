import { invoke } from "@tauri-apps/api/core";
import {
  type IDataManagementService,
  type DatabaseStats,
  type ExportResult,
  type GenericImportResult,
} from "../interfaces";

export class TauriDataManagementService implements IDataManagementService {
  async getDatabaseStats(): Promise<DatabaseStats> {
    try {
      return await invoke<DatabaseStats>("get_database_stats");
    } catch (error) {
      console.error("Failed to get database stats:", error);
      throw error;
    }
  }

  async exportDatabase(path?: string): Promise<ExportResult> {
    try {
      if (!path) {
        throw new Error("Export path is required for Tauri");
      }
      return await invoke<ExportResult>("export_database", {
        exportPath: path,
      });
    } catch (error) {
      console.error("Failed to export database:", error);
      return {
        success: false,
        message: String(error),
      };
    }
  }

  async importDatabase(
    content: string,
    merge: boolean,
  ): Promise<GenericImportResult> {
    try {
      // In Tauri, we might pass the file path or content.
      // The old "DataManagementPage" read the file content using `readTextFile`.
      // The Rust command `import_database` (legacy) accepted `import_content`.
      // We will match that signature.

      // Note: The Rust command returns a specific struct. We map it to GenericImportResult.
      // The Rust return structure should match GenericImportResult fields.
      return await invoke<GenericImportResult>("import_database", {
        importContent: content,
        merge,
      });
    } catch (error) {
      console.error("Failed to import database:", error);
      return {
        success: false,
        message: String(error),
        topics_count: 0,
        questions_count: 0,
        progress_count: 0,
        quiz_sessions_count: 0,
      };
    }
  }
}
