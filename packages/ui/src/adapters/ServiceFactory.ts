import {
  ITopicsService,
  IQuestionsService,
  IQueryService,
  IProgressService,
  IQuizService,
  IFileSystemService,
  IDataManagementService,
} from "../services/interfaces";

let topicsService: ITopicsService | null = null;
let questionsService: IQuestionsService | null = null;
let queryService: IQueryService | null = null;
let progressService: IProgressService | null = null;
let quizService: IQuizService | null = null;
let fileSystemService: IFileSystemService | null = null;
let dataManagementService: IDataManagementService | null = null;

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
