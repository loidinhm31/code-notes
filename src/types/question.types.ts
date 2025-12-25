export interface Answer {
  markdown: string;
}

export interface Question {
  id: string;
  topicId: string;
  subtopic?: string;
  questionNumber: number;
  question: string;
  answer: Answer;
  tags: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuestionDto {
  topicId: string;
  subtopic?: string;
  questionNumber: number;
  question: string;
  answer: Answer;
  tags: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  order: number;
}

export interface UpdateQuestionDto {
  topicId?: string;
  subtopic?: string;
  questionNumber?: number;
  question?: string;
  answer?: Answer;
  tags?: string[];
  difficulty?: "beginner" | "intermediate" | "advanced";
  order?: number;
}
