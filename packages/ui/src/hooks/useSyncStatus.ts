import { useCallback, useEffect, useState } from "react";
import { SyncStatus, AUTH_STORAGE_KEYS } from "@code-notes/shared";
import { syncService } from "@code-notes/ui/services";

/**
 * Check auth status from localStorage without calling the server.
 * This is used for periodic status checks to avoid unnecessary API calls.
 */
function getLocalAuthStatus(): { isAuthenticated: boolean } {
  const accessToken = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
  return { isAuthenticated: !!accessToken };
}

interface UseSyncStatusOptions {
  autoRefreshInterval?: number;
}

interface UseSyncStatusResult {
  isAuthenticated: boolean;
  syncStatus: SyncStatus | null;
  isSyncing: boolean;
  lastSyncSuccess: boolean | null;
  error: string | null;
  triggerSync: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSyncStatus(
  options: UseSyncStatusOptions = {},
): UseSyncStatusResult {
  const { autoRefreshInterval = 30000 } = options;

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncSuccess, setLastSyncSuccess] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      // Get auth status from localStorage (no server call)
      const auth = getLocalAuthStatus();
      setIsAuthenticated(auth.isAuthenticated);

      // Only get sync status if sync service is available
      const sync = await syncService.getStatus();
      if (sync) {
        setSyncStatus(sync);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load status");
    }
  }, []);

  const triggerSync = async () => {
    if (!isAuthenticated) {
      setError("Not logged in");
      return;
    }

    if (isSyncing) return;

    setIsSyncing(true);
    setError(null);

    try {
      const result = await syncService.syncNow();
      if (!result) {
        setError("Sync service not available");
        setLastSyncSuccess(false);
        return;
      }
      setLastSyncSuccess(result.success);
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
      setLastSyncSuccess(false);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, autoRefreshInterval);
    return () => clearInterval(interval);
  }, [autoRefreshInterval, loadStatus]);

  return {
    isAuthenticated,
    syncStatus,
    isSyncing,
    lastSyncSuccess,
    error,
    triggerSync,
    refresh: loadStatus,
  };
}
