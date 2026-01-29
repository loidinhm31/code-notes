import {
  setTopicsService,
  setQuestionsService,
  // Add others...
} from "./ServiceFactory";
import { topicsService as tauriTopicsService } from "./tauri/topics.service";
import { WebTopicsService } from "./web/WebTopicsService";
import { WebQuestionsService } from "./web/WebQuestionsService";

// Helper to check if running in Tauri
const isTauri = () => {
  return "__TAURI_INTERNALS__" in window;
};

export const initializeServices = () => {
  if (isTauri()) {
    console.log("Initializing Tauri Services");
    // Tauri services usually just invoke commands
    setTopicsService(tauriTopicsService);
    // setQuestionsService(tauriQuestionsService); // Need to implement/export this
    // ...
  } else {
    console.log("Initializing Web Services (Dexie)");
    setTopicsService(new WebTopicsService());
    setQuestionsService(new WebQuestionsService());
    // ...
  }
};
