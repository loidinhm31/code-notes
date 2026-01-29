import React from "react";
import ReactDOM from "react-dom/client";
import { PlatformProvider, App } from "@code-notes/ui";
import "@code-notes/ui/styles";
import { tauriPlatform } from "./adapters/tauri/PlatformAdapter";
import {
    setTopicsService,
    setQuestionsService,
    setQueryService,
    setProgressService,
    setQuizService,
    setDataManagementService,
    tauriAdapters
} from "@code-notes/ui/services";

// Initialize services with Tauri implementations
setTopicsService(tauriAdapters.topicsService);
setQuestionsService(tauriAdapters.questionsService);
setQueryService(tauriAdapters.queryService);
setProgressService(tauriAdapters.progressService);
setQuizService(tauriAdapters.quizService);
setDataManagementService(new tauriAdapters.TauriDataManagementService());

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <PlatformProvider services={tauriPlatform}>
            <App />
        </PlatformProvider>
    </React.StrictMode>
);
