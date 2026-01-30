import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Cloud,
  CloudOff,
  LogOut,
  RefreshCw,
  Server,
  User,
} from "lucide-react";
import { Button, Input, Label } from "@code-notes/ui/components";
import {
  getAuthService,
  getSyncServiceOptional,
} from "@code-notes/ui/adapters";
import type { AuthStatus, SyncResult } from "@code-notes/shared";
import { env } from "@code-notes/shared";

interface SyncSettingsProps {
  onLogout?: () => void;
}

export const SyncSettings: React.FC<SyncSettingsProps> = ({ onLogout }) => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    isAuthenticated: false,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSyncAt, setLastSyncAt] = useState<number | undefined>();
  const [pendingChanges, setPendingChanges] = useState<number>(0);

  // Login form state
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Server config
  const [serverUrl, setServerUrl] = useState<string>(env.serverUrl);
  const [appId, setAppId] = useState<string>(env.appId);
  const [apiKey, setApiKey] = useState<string>(env.apiKey);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setIsLoading(true);
    try {
      const auth = getAuthService();
      const status = await auth.getStatus();
      setAuthStatus(status);

      if (status.serverUrl) setServerUrl(status.serverUrl);

      const syncService = getSyncServiceOptional();
      if (syncService) {
        const syncStatus = await syncService.getStatus();
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
      const auth = getAuthService();
      await auth.configureSync({ serverUrl, appId, apiKey });
      setError(null);
      await loadStatus();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save configuration",
      );
    }
  };

  const handleLogin = async () => {
    const auth = getAuthService();

    setIsLoggingIn(true);
    setError(null);

    try {
      await auth.login(email, password);
      setShowLoginForm(false);
      setEmail("");
      setPassword("");
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      const auth = getAuthService();
      await auth.logout();
      setAuthStatus({ isAuthenticated: false });
      setSyncResult(null);
      setError(null);
      onLogout?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logout failed");
    }
  };

  const handleSync = async () => {
    if (!authStatus.isAuthenticated) {
      setError("Not authenticated. Please login first.");
      return;
    }

    const syncService = getSyncServiceOptional();
    if (!syncService) {
      setError("Sync service not initialized");
      return;
    }

    setIsSyncing(true);
    setError(null);
    setSyncResult(null);

    try {
      const result = await syncService.syncNow();
      setSyncResult(result);
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setIsSyncing(false);
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
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="default"
                size="default"
                onClick={() => setShowLoginForm(!showLoginForm)}
              >
                <User className="w-4 h-4" />
                {showLoginForm ? "Cancel" : "Login to Sync"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Login Form */}
      {showLoginForm && !authStatus.isAuthenticated && (
        <div className="clay-card p-6">
          <h3 className="text-lg font-semibold mb-4">Login</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sync-email" className="mb-2 block text-sm">
                Email
              </Label>
              <Input
                id="sync-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <div>
              <Label htmlFor="sync-password" className="mb-2 block text-sm">
                Password
              </Label>
              <Input
                id="sync-password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <Button
              variant="default"
              size="default"
              className="w-full"
              onClick={handleLogin}
              disabled={isLoggingIn || !email || !password}
            >
              {isLoggingIn ? "Logging in..." : "Login"}
            </Button>
          </div>
        </div>
      )}

      {/* Server Configuration */}
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
              <div>
                <Label htmlFor="app-id" className="mb-2 block text-sm">
                  App ID
                </Label>
                <Input
                  id="app-id"
                  type="text"
                  placeholder="code-notes"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="api-key" className="mb-2 block text-sm">
                  API Key
                </Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="API Key from server admin"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
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
    </div>
  );
};
