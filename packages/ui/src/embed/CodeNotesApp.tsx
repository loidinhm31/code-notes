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
} from "@code-notes/ui/adapters/factory";
import { QmServerAuthAdapter } from "@code-notes/ui/adapters/shared";

// Web adapters (used for both platforms)
import {
  IndexedDBSyncAdapter,
  WebDataManagementAdapter,
  webPlatform,
  WebProgressAdapter,
  WebQueryAdapter,
  WebQuestionsAdapter,
  WebQuizAdapter,
  WebTopicsAdapter,
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
}: CodeNotesEmbedProps) {
  // Initialize services synchronously before first render
  const platform = useMemo<IPlatformServices>(() => {
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
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );

  useEffect(() => {
    setPortalContainer(containerRef.current);
  }, []);

  // If external auth tokens are provided, save them to the auth service
  useEffect(() => {
    if (authTokens?.accessToken && authTokens?.refreshToken) {
      const auth = getAuthService() as QmServerAuthAdapter;
      auth
        .saveTokensExternal?.(
          authTokens.accessToken,
          authTokens.refreshToken,
          authTokens.userId || "",
        )
        .catch(console.error);
    }
  }, [authTokens]);

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
      <PlatformProvider services={platform}>
        <ThemeProvider embedded={embedded}>
          <BasePathContext.Provider value={basePath || ""}>
            <PortalContainerContext.Provider value={portalContainer}>
              {useRouter ? (
                <BrowserRouter basename={basePath}>{content}</BrowserRouter>
              ) : (
                content
              )}
            </PortalContainerContext.Provider>
          </BasePathContext.Provider>
        </ThemeProvider>
      </PlatformProvider>
    </div>
  );
}
