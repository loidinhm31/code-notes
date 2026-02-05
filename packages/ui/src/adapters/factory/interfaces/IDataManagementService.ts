import {
  DatabaseStats,
  ExportResult,
  GenericImportResult,
} from "@code-notes/shared";

export interface IDataManagementService {
  getDatabaseStats(): Promise<DatabaseStats>;
  exportDatabase(path?: string): Promise<ExportResult>;
  importDatabase(content: string, merge: boolean): Promise<GenericImportResult>;
}
