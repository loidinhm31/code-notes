// Re-export from adapters (single source of truth, matching fin-catch pattern)
export {
  setTopicsService,
  getTopicsService,
  setQuestionsService,
  getQuestionsService,
  setQueryService,
  getQueryService,
  setProgressService,
  getProgressService,
  setQuizService,
  getQuizService,
  setFileSystemService,
  getFileSystemService,
  setDataManagementService,
  getDataManagementService,
} from "../adapters/ServiceFactory";
