import Dexie, { type EntityTable } from "dexie";
import type {
    Topic,
    Question,
    QuizSession,
    QuestionProgress
} from "@code-notes/shared";

export class CodeNotesDB extends Dexie {
    topics!: EntityTable<Topic, "id">;
    questions!: EntityTable<Question, "id">;
    quizSessions!: EntityTable<QuizSession, "id">;
    progress!: EntityTable<QuestionProgress, "questionId">;

    constructor() {
        super("CodeNotesDB");
        this.version(1).stores({
            topics: "id, name, createdAt, updatedAt",
            questions: "id, topicId, questionNumber, createdAt, updatedAt",
            quizSessions: "id, startedAt, status",
            progress: "questionId, nextReviewAt, status"
        });
    }
}

export const db = new CodeNotesDB();
