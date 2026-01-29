import React from "react";
import ReactDOM from "react-dom/client";
import { PlatformProvider, App } from "@code-notes/ui";
import "@code-notes/ui/styles"; // Import global styles
import { webPlatform } from "./adapters/web/StorageAdapter";
import {
    setTopicsService,
    setQuestionsService,
    setQueryService,
    setProgressService,
    setQuizService,
    setDataManagementService,
} from "@code-notes/ui/services";

// Mock services for now (placeholder)
// In a real app, these would be IndexedDB implementations or API clients
import {
    mockQueryService,
    mockProgressService,
    mockQuizService
} from "./adapters/web/mockServices";
import { webAdapters, unifiedImportService } from "@code-notes/ui/services";

// Initialize services
// Use IndexedDB for Topics and Questions
setTopicsService(new webAdapters.WebTopicsService());
setQuestionsService(new webAdapters.WebQuestionsService());
setDataManagementService(new webAdapters.WebDataManagementService());

// Use mocks for others for now (until implemented)
setQueryService(mockQueryService);
setProgressService(mockProgressService);
setQuizService(mockQuizService);

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <PlatformProvider services={webPlatform}>
            <App />
        </PlatformProvider>
    </React.StrictMode>
);
