import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Cloud,
  CloudOff,
  RefreshCw,
  Server,
} from "lucide-react";
import { Button, Input, Label } from "@code-notes/ui/components/atoms";
import { authService, syncService } from "@code-notes/ui/services";
import type { AuthStatus, SyncProgress, SyncResult } from "@code-notes/shared";
import { env } from "@code-notes/shared";
import { isTauri } from "@code-notes/ui/utils";

interface SyncSettingsProps {}

export const SyncSettings: React.FC<SyncSettingsProps> = ({}) => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    isAuthenticated: false,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSyncAt, setLastSyncAt] = useState<number | undefined>();
  const [pendingChanges, setPendingChanges] = useState<number>(0);

  // Server config
  const [serverUrl, setServerUrl] = useState<string>(env.serverUrl);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setIsLoading(true);
    try {
      const status = await authService.getStatus();
      setAuthStatus(status);

      if (status.serverUrl) setServerUrl(status.serverUrl);

      const syncStatus = await syncService.getStatus();
      if (syncStatus) {
        setLastSyncAt(syncStatus.lastSyncAt);
        setPendingChanges(syncStatus.pendingChanges);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      await authService.configureSync({
        serverUrl,
        appId: "code-notes",
        apiKey: "",
      });
      setError(null);
      await loadStatus();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save configuration",
      );
    }
  };

  const handleSync = async () => {
    if (!authStatus.isAuthenticated) {
      setError("Not authenticated. Please login first.");
      return;
    }

    setIsSyncing(true);
    setError(null);
    setSyncResult(null);
    setSyncProgress(null);

    try {
      let result: SyncResult | null;
      result = await syncService.syncWithProgress((progress) => {
        setSyncProgress(progress);
      });

      if (!result) {
        result = await syncService.syncNow();
      }

      if (!result) {
        setError("Sync service not available");
        return;
      }

      setSyncResult(result);
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  const formatTimestamp = (timestamp?: string | number) => {
    if (!timestamp) return "Never";
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return "Invalid date";
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className="clay-card p-6">
        <div className="flex items-start gap-4">
          <Cloud
            className="w-6 h-6"
            style={{ color: "var(--color-primary)" }}
          />
          <div className="flex-1">
            <h2 className="text-2xl font-semibold mb-2">Cloud Sync</h2>
            <p className="mb-4" style={{ color: "var(--color-text-muted)" }}>
              Keep your notes synchronized across devices
            </p>

            {/* Status indicator */}
            <div className="flex items-center gap-2 mb-4">
              {isSyncing ? (
                <RefreshCw
                  className="w-4 h-4 animate-spin"
                  style={{ color: "var(--color-primary)" }}
                />
              ) : authStatus.isAuthenticated ? (
                <CheckCircle2
                  className="w-4 h-4"
                  style={{ color: "var(--color-success, #22c55e)" }}
                />
              ) : (
                <CloudOff
                  className="w-4 h-4"
                  style={{ color: "var(--color-text-muted)" }}
                />
              )}
              <span
                className="text-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
                {isSyncing
                  ? "Syncing..."
                  : authStatus.isAuthenticated
                    ? "Connected"
                    : "Not logged in"}
              </span>
              {lastSyncAt && (
                <span
                  className="text-xs"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  — Last sync: {formatTimestamp(lastSyncAt)}
                </span>
              )}
            </div>

            {/* Pending changes badge */}
            {pendingChanges > 0 && (
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4"
                style={{
                  background: "var(--color-bg-muted)",
                  color: "var(--color-primary)",
                  border: "2px solid var(--color-border-light)",
                }}
              >
                <AlertCircle className="w-3 h-3" />
                {pendingChanges} pending change{pendingChanges !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>

        {/* Sync Result */}
        {syncResult && (
          <div
            className="mt-4 p-4 rounded-lg"
            style={{
              background: syncResult.success
                ? "var(--color-bg-muted)"
                : "rgba(239, 68, 68, 0.1)",
              border: `2px solid ${syncResult.success ? "var(--color-border-light)" : "rgba(239, 68, 68, 0.3)"}`,
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              {syncResult.success ? (
                <CheckCircle2
                  className="w-4 h-4"
                  style={{ color: "var(--color-success, #22c55e)" }}
                />
              ) : (
                <AlertCircle className="w-4 h-4" style={{ color: "#ef4444" }} />
              )}
              <span className="text-sm font-semibold">
                {syncResult.success
                  ? "Sync completed"
                  : `Sync failed${syncResult.error ? `: ${syncResult.error}` : ""}`}
              </span>
            </div>

            {syncResult.success && (
              <div className="grid grid-cols-3 gap-3">
                <div
                  className="text-center p-2 rounded"
                  style={{ background: "var(--color-bg-card)" }}
                >
                  <ArrowUpCircle
                    className="w-4 h-4 mx-auto mb-1"
                    style={{ color: "var(--color-primary)" }}
                  />
                  <div className="text-lg font-bold">{syncResult.pushed}</div>
                  <div
                    className="text-xs"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Pushed
                  </div>
                </div>
                <div
                  className="text-center p-2 rounded"
                  style={{ background: "var(--color-bg-card)" }}
                >
                  <ArrowDownCircle
                    className="w-4 h-4 mx-auto mb-1"
                    style={{ color: "var(--color-accent, #8b5cf6)" }}
                  />
                  <div className="text-lg font-bold">{syncResult.pulled}</div>
                  <div
                    className="text-xs"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Pulled
                  </div>
                </div>
                <div
                  className="text-center p-2 rounded"
                  style={{ background: "var(--color-bg-card)" }}
                >
                  <AlertCircle
                    className="w-4 h-4 mx-auto mb-1"
                    style={{
                      color:
                        syncResult.conflicts > 0
                          ? "#f59e0b"
                          : "var(--color-text-muted)",
                    }}
                  />
                  <div className="text-lg font-bold">
                    {syncResult.conflicts}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Conflicts
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sync Progress */}
        {isSyncing && syncProgress && (
          <div
            className="mt-4 p-3 rounded-lg"
            style={{
              background: "var(--color-bg-muted)",
              border: "2px solid var(--color-border-light)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw
                className="w-4 h-4 animate-spin"
                style={{ color: "var(--color-primary)" }}
              />
              <span className="text-sm font-medium">
                {syncProgress.phase === "pushing" ? "Pushing..." : "Pulling..."}
              </span>
            </div>
            <div
              className="text-sm"
              style={{ color: "var(--color-text-muted)" }}
            >
              {syncProgress.phase === "pushing" ? (
                <span>{syncProgress.recordsPushed} records pushed</span>
              ) : (
                <span>
                  {syncProgress.recordsPulled} records pulled (page{" "}
                  {syncProgress.currentPage})
                  {syncProgress.hasMore && " - more pages available"}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="mt-4 p-3 rounded-lg text-sm"
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "2px solid rgba(239, 68, 68, 0.3)",
              color: "#ef4444",
            }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex flex-col gap-3">
          {authStatus.isAuthenticated ? (
            <>
              <Button
                variant="default"
                size="default"
                onClick={handleSync}
                disabled={isSyncing || isLoading}
              >
                <RefreshCw
                  className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`}
                />
                {isSyncing ? "Syncing..." : "Sync Now"}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {/* Server Configuration - Only shown in Tauri (native) mode */}
      {isTauri() && (
        <div className="clay-card p-6">
          <div className="flex items-start gap-4">
            <Server
              className="w-6 h-6"
              style={{ color: "var(--color-primary)" }}
            />
            <div className="flex-1">
              <h2 className="text-2xl font-semibold mb-2">
                Server Configuration
              </h2>
              <p className="mb-4" style={{ color: "var(--color-text-muted)" }}>
                Configure the sync server connection
              </p>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="server-url" className="mb-2 block text-sm">
                    Server URL
                  </Label>
                  <Input
                    id="server-url"
                    type="text"
                    placeholder="http://localhost:3000"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                  />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSaveConfig}
                  disabled={isLoading || !serverUrl}
                >
                  Save Configuration
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
