import type { SyncResult, SyncStatus } from "../types/sync";

/**
 * Sync service interface for data synchronization
 * Implemented by platform-specific adapters:
 * - IndexedDBSyncAdapter: Uses IndexedDB for web
 * - TauriSyncAdapter: Uses Tauri invoke for desktop
 */
export interface ISyncService {
  /**
   * Trigger a sync operation
   * Pushes local changes and pulls remote changes
   */
  syncNow(): Promise<SyncResult>;

  /**
   * Get current sync status
   */
  getStatus(): Promise<SyncStatus>;
}
