// Progress tracking types

export type ProgressStatus =
  | "NotStudied"
  | "Studying"
  | "Mastered"
  | "NeedsReview";

export interface QuestionProgress {
  questionId: string;
  topicId: string;
  status: ProgressStatus;
  confidenceLevel: number; // 0-5 scale
  timesReviewed: number;
  timesCorrect: number;
  timesIncorrect: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProgressDto {
  status?: ProgressStatus;
  confidenceLevel?: number;
  wasCorrect?: boolean; // For quiz results
}

export interface ProgressStatistics {
  notStudied: number;
  studying: number;
  mastered: number;
  needsReview: number;
  totalQuestions: number;
  averageConfidence: number;
  questionsReviewedToday: number;
  questionsDueForReview: number;
}

// Quiz session types

export type QuizSessionType =
  | "Random"
  | "Sequential"
  | "QuickRefresher"
  | "TopicFocused"
  | "DifficultyFocused";

export interface QuizResult {
  questionId: string;
  wasCorrect: boolean;
  confidenceRating: number; // 1-5 stars
  timeSpentSeconds?: number;
  answeredAt: string;
}

export interface QuizSession {
  id: string;
  sessionType: QuizSessionType;
  topicIds: string[];
  questionIds: string[];
  currentIndex: number;
  startedAt: string;
  completedAt?: string;
  results: QuizResult[];
}

export interface CreateQuizSessionDto {
  sessionType: QuizSessionType;
  topicIds?: string[];
  difficulty?: "beginner" | "intermediate" | "advanced";
  maxQuestions?: number;
}

// Helper types for UI

export interface ProgressBadgeProps {
  status: ProgressStatus;
  confidenceLevel?: number;
  compact?: boolean;
}

export interface ConfidenceRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
}

// Progress colors for UI
export const PROGRESS_STATUS_COLORS: Record<ProgressStatus, string> = {
  NotStudied: "gray",
  Studying: "blue",
  Mastered: "green",
  NeedsReview: "yellow",
};

export const PROGRESS_STATUS_LABELS: Record<ProgressStatus, string> = {
  NotStudied: "Not Studied",
  Studying: "Studying",
  Mastered: "Mastered",
  NeedsReview: "Needs Review",
};
