export interface IFileSystemService {
  importData(data: string): Promise<boolean>;
  exportData(): Promise<string>;
}
