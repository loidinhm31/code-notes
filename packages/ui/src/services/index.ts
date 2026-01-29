export * from "./interfaces";
export * from "./ServiceFactory";
export * as tauriAdapters from "./tauri";
export * as webAdapters from "./web";
export { importService as unifiedImportService } from "./importer/ImportService";


// We need to move/merge the ImportResult interface to `interfaces.ts` if it isn't already generic
// The `interfaces.ts` file I read earlier did NOT have `ImportResult`.
// I should update `interfaces.ts` to include `ImportResult` and related types
// so `ImportService.ts` can import them without circular deps or relying on the old tauri file.
