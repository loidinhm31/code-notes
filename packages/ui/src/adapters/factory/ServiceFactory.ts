import type {
  ITopicsService,
  IQuestionsService,
  IQueryService,
  IProgressService,
  IQuizService,
  IFileSystemService,
  IDataManagementService,
  ISyncService,
  IAuthService,
} from "./interfaces";
import { QmServerAuthAdapter } from "@code-notes/ui/adapters/shared";
import {
  TauriAuthAdapter,
  TauriSyncAdapter,
} from "@code-notes/ui/adapters/tauri";
import { isTauri, serviceLogger } from "@code-notes/ui/utils";

let topicsService: ITopicsService | null = null;
let questionsService: IQuestionsService | null = null;
let queryService: IQueryService | null = null;
let progressService: IProgressService | null = null;
let quizService: IQuizService | null = null;
let fileSystemService: IFileSystemService | null = null;
let dataManagementService: IDataManagementService | null = null;
let syncService: ISyncService | null = null;
let authService: IAuthService | null = null;

export const setTopicsService = (service: ITopicsService) => {
  topicsService = service;
};

export const getTopicsService = (): ITopicsService => {
  if (!topicsService) throw new Error("TopicsService not initialized");
  return topicsService;
};

export const setQuestionsService = (service: IQuestionsService) => {
  questionsService = service;
};

export const getQuestionsService = (): IQuestionsService => {
  if (!questionsService) throw new Error("QuestionsService not initialized");
  return questionsService;
};

export const setQueryService = (service: IQueryService) => {
  queryService = service;
};

export const getQueryService = (): IQueryService => {
  if (!queryService) throw new Error("QueryService not initialized");
  return queryService;
};

export const setProgressService = (service: IProgressService) => {
  progressService = service;
};

export const getProgressService = (): IProgressService => {
  if (!progressService) throw new Error("ProgressService not initialized");
  return progressService;
};

export const setQuizService = (service: IQuizService) => {
  quizService = service;
};

export const getQuizService = (): IQuizService => {
  if (!quizService) throw new Error("QuizService not initialized");
  return quizService;
};

export const setFileSystemService = (service: IFileSystemService) => {
  fileSystemService = service;
};

export const getFileSystemService = (): IFileSystemService => {
  if (!fileSystemService) throw new Error("FileSystemService not initialized");
  return fileSystemService;
};

export const setDataManagementService = (service: IDataManagementService) => {
  dataManagementService = service;
};

export const getDataManagementService = (): IDataManagementService => {
  if (!dataManagementService)
    throw new Error("DataManagementService not initialized");
  return dataManagementService;
};

export const setSyncService = (service: ISyncService) => {
  syncService = service;
};

export const getSyncService = (): ISyncService => {
  if (!syncService) {
    if (isTauri()) {
      syncService = new TauriSyncAdapter();
      serviceLogger.factory("Created SyncService for Tauri");
    } else {
      throw new Error("SyncService not initialized for web platform");
    }
  }
  return syncService;
};

export const getSyncServiceOptional = (): ISyncService | null => {
  return syncService;
};

export const setAuthService = (service: IAuthService) => {
  authService = service;
};

export const getAuthService = (): IAuthService => {
  if (!authService) {
    if (isTauri()) {
      authService = new TauriAuthAdapter();
      serviceLogger.factory("Created AuthService for Tauri");
    } else {
      authService = new QmServerAuthAdapter();
      serviceLogger.factory("Created AuthService for Web");
    }
  }
  return authService;
};

export const getAuthServiceOptional = (): IAuthService | null => {
  return authService;
};

/**
 * Reset all services (useful for testing or logout)
 */
export const resetServices = (): void => {
  topicsService = null;
  questionsService = null;
  queryService = null;
  progressService = null;
  quizService = null;
  fileSystemService = null;
  dataManagementService = null;
  syncService = null;
  authService = null;
  serviceLogger.factory("All services reset");
};

/**
 * Get all initialized services
 */
export const getAllServices = () => ({
  topics: topicsService,
  questions: questionsService,
  query: queryService,
  progress: progressService,
  quiz: quizService,
  fileSystem: fileSystemService,
  dataManagement: dataManagementService,
  sync: syncService,
  auth: authService,
});
