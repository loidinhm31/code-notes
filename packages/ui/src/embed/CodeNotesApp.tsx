/**
 * CodeNotesApp - Embeddable wrapper component for code-notes
 *
 * This component can be used to embed code-notes into other applications.
 * It sets up all necessary services and providers.
 *
 * Both Tauri and Web platforms now use the same IndexedDB-backed adapters
 * for data storage and sync. The only difference is platform services
 * (openUrl, file system access via Tauri plugins).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import type { IPlatformServices } from "@code-notes/ui/platform";
import { PlatformProvider } from "@code-notes/ui/platform";
import type { CodeNotesEmbedProps } from "./types";
import { BasePathContext, PortalContainerContext } from "@code-notes/ui/hooks";
import { useAutoSync } from "../hooks/useAutoSync";

// Adapters
import {
  getAuthService,
  setAuthService,
  setDataManagementService,
  setProgressService,
  setQueryService,
  setQuestionsService,
  setQuizService,
  setSyncService,
  setTopicsService,
  getSyncService,
} from "@code-notes/ui/adapters/factory";
import { QmServerAuthAdapter } from "@code-notes/ui/adapters/shared";

// Web adapters (used for both platforms)
import {
  IndexedDBSyncAdapter,
  IndexedDBSyncStorage,
  WebDataManagementAdapter,
  webPlatform,
  WebProgressAdapter,
  WebQueryAdapter,
  WebQuestionsAdapter,
  WebQuizAdapter,
  WebTopicsAdapter,
  initDb,
  deleteCurrentDb,
} from "@code-notes/ui/adapters/web";
import { env } from "@code-notes/shared";

// Tauri platform services (only for openUrl, file system)
import { tauriPlatform } from "@code-notes/ui/adapters/tauri";
import { AppShell } from "@code-notes/ui/components/templates";
import { ThemeProvider } from "@code-notes/ui/contexts";

/**
 * Check if running in Tauri
 */
function isTauri(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

/**
 * CodeNotesApp - Main embeddable component
 */
export function CodeNotesApp({
  authTokens,
  embedded = false,
  useRouter = true,
  basePath,
  className,
  onLogoutRequest,
  registerLogoutCleanup,
}: CodeNotesEmbedProps) {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    setDbReady(false);
    initDb(authTokens?.userId)
      .then(() => setDbReady(true))
      .catch(console.error);
  }, [authTokens?.userId]);

  // Register logout cleanup with hub after DB is ready
  useEffect(() => {
    if (!dbReady || !registerLogoutCleanup) return;
    const unregister = registerLogoutCleanup("code-notes", async () => {
      try {
        const storage = new IndexedDBSyncStorage();
        const hasPending = await storage.hasPendingChanges();
        if (hasPending) {
          const syncService = getSyncService();
          const result = await syncService.syncNow();
          if (!result.success) return { success: false, error: result.error };
        }
        await deleteCurrentDb();
        return { success: true };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : "Cleanup failed" };
      }
    });
    return unregister;
  }, [dbReady, registerLogoutCleanup]);

  // Initialize services only after DB is ready
  const platform = useMemo<IPlatformServices>(() => {
    if (!dbReady) return {} as IPlatformServices;

    setTopicsService(new WebTopicsAdapter());
    setQuestionsService(new WebQuestionsAdapter());
    setQueryService(new WebQueryAdapter());
    setProgressService(new WebProgressAdapter());
    setQuizService(new WebQuizAdapter());
    setDataManagementService(new WebDataManagementAdapter());

    // Auth service - single source of truth for tokens
    const auth = getAuthService() as QmServerAuthAdapter;
    setAuthService(auth);

    const syncAdapter = new IndexedDBSyncAdapter({
      getConfig: () => auth.getSyncConfig(),
      getTokens: () => auth.getTokens(),
      saveTokens: (accessToken, refreshToken, userId) =>
        auth.saveTokensExternal(accessToken, refreshToken, userId),
    });

    setSyncService(syncAdapter);

    // Platform differs only for openUrl/fileSystem:
    // - Tauri: uses @tauri-apps/plugin-opener for native URL handling
    // - Web: uses window.open for browser URL handling
    return isTauri() ? tauriPlatform : webPlatform;
  }, [dbReady]);

  const isAuthenticated = !!(authTokens?.accessToken && authTokens?.refreshToken);
  useAutoSync({
    syncService: dbReady ? getSyncService() : null,
    enabled: dbReady && isAuthenticated && embedded,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );

  useEffect(() => {
    if (containerRef.current) setPortalContainer(containerRef.current);
  }, [dbReady]);

  // If external auth tokens are provided, save them to the auth service
  useEffect(() => {
    if (dbReady && authTokens?.accessToken && authTokens?.refreshToken) {
      const auth = getAuthService() as QmServerAuthAdapter;
      auth
        .saveTokensExternal?.(
          authTokens.accessToken,
          authTokens.refreshToken,
          authTokens.userId || "",
        )
        .catch(console.error);
    }
  }, [dbReady, authTokens]);

  if (!dbReady) return null;

  // Determine if we should skip auth (tokens provided externally)
  const skipAuth = !!(authTokens?.accessToken && authTokens?.refreshToken);

  const content = (
    <AppShell
      embedded={embedded}
      onLogoutRequest={onLogoutRequest}
      skipAuth={skipAuth}
    />
  );

  return (
    <div ref={containerRef} className={className}>
      <ThemeProvider embedded={embedded}>
        <PlatformProvider services={platform}>
          <BasePathContext.Provider value={basePath || ""}>
            <PortalContainerContext.Provider value={portalContainer}>
              {useRouter ? (
                <BrowserRouter basename={basePath}>{content}</BrowserRouter>
              ) : (
                content
              )}
            </PortalContainerContext.Provider>
          </BasePathContext.Provider>
        </PlatformProvider>
      </ThemeProvider>
    </div>
  );
}
