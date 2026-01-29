import { db } from "../../services/web/DexieDB";
import type { IProgressService } from "../../services/interfaces";
import type {
  QuestionProgress,
  UpdateProgressDto,
  ProgressStatistics,
  ProgressStatus,
} from "@code-notes/shared";

export class WebProgressService implements IProgressService {
  async getAll(): Promise<QuestionProgress[]> {
    return await db.progress.toArray();
  }

  async getByQuestion(questionId: string): Promise<QuestionProgress | null> {
    return (await db.progress.get(questionId)) || null;
  }

  async getByTopic(topicId: string): Promise<QuestionProgress[]> {
    const questions = await db.questions
      .where("topicId")
      .equals(topicId)
      .toArray();
    const questionIds = new Set(questions.map((q) => q.id));
    const allProgress = await db.progress.toArray();
    return allProgress.filter((p) => questionIds.has(p.questionId));
  }

  async update(
    questionId: string,
    dto: UpdateProgressDto,
  ): Promise<QuestionProgress> {
    const now = new Date().toISOString();
    let existing = await db.progress.get(questionId);

    if (!existing) {
      // Find question to get topicId
      const question = await db.questions.get(questionId);
      existing = {
        questionId,
        topicId: question?.topicId || "",
        status: "NotStudied",
        confidenceLevel: 0,
        timesReviewed: 0,
        timesCorrect: 0,
        timesIncorrect: 0,
        createdAt: now,
        updatedAt: now,
      };
    }

    const updated: QuestionProgress = { ...existing };
    updated.updatedAt = now;
    updated.lastReviewedAt = now;
    updated.timesReviewed += 1;

    if (dto.status !== undefined) {
      updated.status = dto.status;
    }

    if (dto.confidenceLevel !== undefined) {
      updated.confidenceLevel = dto.confidenceLevel;
    }

    if (dto.wasCorrect !== undefined) {
      if (dto.wasCorrect) {
        updated.timesCorrect += 1;
      } else {
        updated.timesIncorrect += 1;
      }
    }

    // Simple spaced repetition: schedule next review
    updated.nextReviewAt = this.calculateNextReview(
      updated.confidenceLevel,
      updated.timesReviewed,
    );

    await db.progress.put(updated);
    return updated;
  }

  async reset(questionId: string): Promise<boolean> {
    const existing = await db.progress.get(questionId);
    if (!existing) return false;

    const now = new Date().toISOString();
    const reset: QuestionProgress = {
      ...existing,
      status: "NotStudied",
      confidenceLevel: 0,
      timesReviewed: 0,
      timesCorrect: 0,
      timesIncorrect: 0,
      lastReviewedAt: undefined,
      nextReviewAt: undefined,
      updatedAt: now,
    };
    await db.progress.put(reset);
    return true;
  }

  async getStatistics(): Promise<ProgressStatistics> {
    const totalQuestions = await db.questions.count();
    const allProgress = await db.progress.toArray();

    const counts: Record<ProgressStatus, number> = {
      NotStudied: 0,
      Studying: 0,
      Mastered: 0,
      NeedsReview: 0,
    };

    let totalConfidence = 0;
    let reviewedToday = 0;
    let dueForReview = 0;
    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();

    for (const p of allProgress) {
      counts[p.status] += 1;
      totalConfidence += p.confidenceLevel;

      if (p.lastReviewedAt && p.lastReviewedAt.startsWith(today)) {
        reviewedToday++;
      }

      if (p.nextReviewAt && p.nextReviewAt <= now) {
        dueForReview++;
      }
    }

    // Questions without progress records count as NotStudied
    const trackedCount = allProgress.length;
    counts.NotStudied += Math.max(0, totalQuestions - trackedCount);

    return {
      notStudied: counts.NotStudied,
      studying: counts.Studying,
      mastered: counts.Mastered,
      needsReview: counts.NeedsReview,
      totalQuestions,
      averageConfidence: trackedCount > 0 ? totalConfidence / trackedCount : 0,
      questionsReviewedToday: reviewedToday,
      questionsDueForReview: dueForReview,
    };
  }

  async getDueForReview(): Promise<QuestionProgress[]> {
    const now = new Date().toISOString();
    const allProgress = await db.progress.toArray();
    return allProgress.filter((p) => p.nextReviewAt && p.nextReviewAt <= now);
  }

  async ensureForAllQuestions(): Promise<number> {
    const questions = await db.questions.toArray();
    const existingIds = new Set(await db.progress.toCollection().primaryKeys());
    const now = new Date().toISOString();
    let created = 0;

    const newProgress: QuestionProgress[] = [];
    for (const q of questions) {
      if (!existingIds.has(q.id)) {
        newProgress.push({
          questionId: q.id,
          topicId: q.topicId,
          status: "NotStudied",
          confidenceLevel: 0,
          timesReviewed: 0,
          timesCorrect: 0,
          timesIncorrect: 0,
          createdAt: now,
          updatedAt: now,
        });
        created++;
      }
    }

    if (newProgress.length > 0) {
      await db.progress.bulkAdd(newProgress);
    }

    return created;
  }

  private calculateNextReview(
    confidence: number,
    timesReviewed: number,
  ): string {
    // Simple spaced repetition intervals (in days)
    const intervals = [1, 3, 7, 14, 30, 60];
    const index = Math.min(Math.max(0, confidence - 1), intervals.length - 1);
    const days = intervals[index] || 1;

    const next = new Date();
    next.setDate(next.getDate() + days);
    return next.toISOString();
  }
}
