import { getSyncServiceOptional } from "../adapters/factory";
import type { SyncProgress, SyncResult, SyncStatus } from "@code-notes/shared";

/**
 * Trigger a sync operation
 * Pushes local changes and pulls remote changes
 * Returns null if sync service is not available
 */
export const syncNow = async (): Promise<SyncResult | null> => {
  const syncService = getSyncServiceOptional();
  if (!syncService) return null;
  return syncService.syncNow();
};

/**
 * Get current sync status
 * Returns null if sync service is not available
 */
export const getStatus = async (): Promise<SyncStatus | null> => {
  const syncService = getSyncServiceOptional();
  if (!syncService) return null;
  return syncService.getStatus();
};

/**
 * Trigger a sync operation with progress updates
 * Optional method for platforms that support progress reporting
 * Returns null if sync service is not available or doesn't support progress
 */
export const syncWithProgress = async (
  onProgress: (progress: SyncProgress) => void,
): Promise<SyncResult | null> => {
  const syncService = getSyncServiceOptional();
  if (!syncService || !syncService.syncWithProgress) return null;
  return syncService.syncWithProgress(onProgress);
};
