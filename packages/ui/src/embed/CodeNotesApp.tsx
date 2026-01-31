/**
 * CodeNotesApp - Embeddable wrapper component for code-notes
 *
 * This component can be used to embed code-notes into other applications.
 * It sets up all necessary services and providers.
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
  setDataManagementService,
  setProgressService,
  setQueryService,
  setQuestionsService,
  setQuizService,
  setSyncService,
  setTopicsService,
} from "@code-notes/ui/adapters/factory";
import { QmServerAuthAdapter } from "@code-notes/ui/adapters/shared";

// Web adapters
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

// Tauri adapters
import {
  progressService as tauriProgressService,
  queryService as tauriQueryService,
  questionsService as tauriQuestionsService,
  quizService as tauriQuizService,
  TauriDataManagementService,
  tauriPlatform,
  topicsService as tauriTopicsService,
} from "@code-notes/ui/adapters/tauri";
import { AppShell } from "@code-notes/ui/components/templates";

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
  embedded = false,
  useRouter = true,
  basePath,
  className,
  onLogoutRequest,
  skipAuth,
}: CodeNotesEmbedProps) {
  // Initialize services synchronously before first render
  // useMemo runs during render (before effects), ensuring services are
  // available when child components mount and call getXxxService()
  const platform = useMemo<IPlatformServices>(() => {
    if (isTauri()) {
      setTopicsService(tauriTopicsService);
      setQuestionsService(tauriQuestionsService);
      setQueryService(tauriQueryService);
      setProgressService(tauriProgressService);
      setQuizService(tauriQuizService);
      setDataManagementService(new TauriDataManagementService());
      return tauriPlatform;
    }

    setTopicsService(new WebTopicsAdapter());
    setQuestionsService(new WebQuestionsAdapter());
    setQueryService(new WebQueryAdapter());
    setProgressService(new WebProgressAdapter());
    setQuizService(new WebQuizAdapter());
    setDataManagementService(new WebDataManagementAdapter());

    // Initialize auth service and sync service
    // Auth service is the single source of truth for tokens
    const auth = getAuthService() as QmServerAuthAdapter;

    const syncAdapter = new IndexedDBSyncAdapter({
      serverUrl: env.serverUrl,
      appId: env.appId,
      apiKey: env.apiKey,
      getTokens: () => auth.getTokens(),
      saveTokens: (accessToken, refreshToken, userId) =>
        auth.saveTokensExternal(accessToken, refreshToken, userId),
    });

    setSyncService(syncAdapter);

    return webPlatform;
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );

  useEffect(() => {
    setPortalContainer(containerRef.current);
  }, []);

  const content = (
    <AppShell
      embedded={embedded}
      onLogoutRequest={onLogoutRequest}
      skipAuth={skipAuth ?? embedded}
    />
  );

  return (
    <div ref={containerRef} className={className}>
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
    </div>
  );
}
