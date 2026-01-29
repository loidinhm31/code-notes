/**
 * CodeNotesApp - Embeddable wrapper component for code-notes
 *
 * This component can be used to embed code-notes into other applications.
 * It sets up all necessary services and providers.
 */

import { useMemo, useRef, useState, useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { PlatformProvider } from "../platform/PlatformContext";
import type { IPlatformServices } from "../platform/PlatformContext";
import App from "../App";
import type { CodeNotesEmbedProps } from "./types";
import { BasePathContext, PortalContainerContext } from "../hooks/useNav";

// Adapters
import {
  setTopicsService,
  setQuestionsService,
  setQueryService,
  setProgressService,
  setQuizService,
  setDataManagementService,
} from "../adapters/ServiceFactory";

// Web services
import { WebTopicsService } from "../services/web/WebTopicsService";
import { WebQuestionsService } from "../services/web/WebQuestionsService";
import { WebDataManagementService } from "../services/web/WebDataManagementService";
import { WebQueryService } from "../adapters/web/WebQueryService";
import { WebProgressService } from "../adapters/web/WebProgressService";
import { WebQuizService } from "../adapters/web/WebQuizService";
import { webPlatform } from "../adapters/web/StorageAdapter";

// Tauri services
import { topicsService as tauriTopicsService } from "../services/tauri/topics.service";
import { questionsService as tauriQuestionsService } from "../services/tauri/questions.service";
import { queryService as tauriQueryService } from "../services/tauri/query.service";
import { progressService as tauriProgressService } from "../services/tauri/progress.service";
import { quizService as tauriQuizService } from "../services/tauri/quiz.service";
import { TauriDataManagementService } from "../services/tauri/TauriDataManagementService";
import { tauriPlatform } from "../adapters/tauri/PlatformAdapter";

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

    setTopicsService(new WebTopicsService());
    setQuestionsService(new WebQuestionsService());
    setQueryService(new WebQueryService());
    setProgressService(new WebProgressService());
    setQuizService(new WebQuizService());
    setDataManagementService(new WebDataManagementService());
    return webPlatform;
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );

  useEffect(() => {
    setPortalContainer(containerRef.current);
  }, []);

  const content = <App />;

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
