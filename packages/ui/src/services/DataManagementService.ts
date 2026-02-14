import { getDataManagementService } from "../adapters/factory";
import {
  DatabaseStats,
  ExportResult,
  GenericImportResult,
} from "@code-notes/shared";

/**
 * Get database statistics (counts, sizes, etc.)
 */
export const getDatabaseStats = (): Promise<DatabaseStats> => {
  return getDataManagementService().getDatabaseStats();
};

/**
 * Export database to file or string
 * @param path Optional file path for export
 */
export const exportDatabase = (path?: string): Promise<ExportResult> => {
  return getDataManagementService().exportDatabase(path);
};

/**
 * Import database from content
 * @param content Database content string (JSON)
 * @param merge Whether to merge with existing data or replace
 */
export const importDatabase = (
  content: string,
  merge: boolean,
): Promise<GenericImportResult> => {
  return getDataManagementService().importDatabase(content, merge);
};
