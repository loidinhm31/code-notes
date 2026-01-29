import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useStore } from "@code-notes/ui/store";
import type { QuizSession } from "@code-notes/shared";
import {
  Trophy,
  Target,
  Clock,
  TrendingUp,
  CheckCircle,
  XCircle,
  Star,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@code-notes/ui/components/ui/button";

export const QuizResultsPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { quizHistory, fetchQuizHistory, questions } = useStore();

  const [session, setSession] = useState<QuizSession | null>(null);

  useEffect(() => {
    fetchQuizHistory();
  }, [fetchQuizHistory]);

  useEffect(() => {
    if (sessionId && quizHistory.length > 0) {
      const found = quizHistory.find((s) => s.id === sessionId);
      if (found) {
        setSession(found);
      }
    }
  }, [sessionId, quizHistory]);

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p
            className="text-xl mb-4"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Quiz not found
          </p>
          <Button
            onClick={() => navigate("/quiz")}
            className="clay-card px-6 py-3"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "white",
            }}
          >
            Start a New Quiz
          </Button>
        </div>
      </div>
    );
  }

  const correctAnswers = session.results.filter((r) => r.wasCorrect).length;
  const totalQuestions = session.results.length;
  const successRate = Math.round((correctAnswers / totalQuestions) * 100);
  const averageConfidence =
    session.results.reduce((sum, r) => sum + r.confidenceRating, 0) /
    totalQuestions;

  const startTime = new Date(session.startedAt);
  const endTime = session.completedAt
    ? new Date(session.completedAt)
    : new Date();
  const durationMinutes = Math.round(
    (endTime.getTime() - startTime.getTime()) / (1000 * 60),
  );

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm mb-6 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-[var(--color-bg-muted)] border-2 border-transparent hover:border-[var(--color-border-light)] cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Topics
      </Link>

      {/* Header */}
      <div className="text-center mb-8">
        <div
          className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
          style={{
            backgroundColor:
              successRate >= 80
                ? "rgba(16, 185, 129, 0.2)"
                : successRate >= 60
                  ? "rgba(245, 158, 11, 0.2)"
                  : "rgba(239, 68, 68, 0.2)",
          }}
        >
          <Trophy
            className="w-10 h-10"
            style={{
              color:
                successRate >= 80
                  ? "#10B981"
                  : successRate >= 60
                    ? "#F59E0B"
                    : "#EF4444",
            }}
          />
        </div>
        <h1
          className="text-3xl font-bold mb-2"
          style={{ color: "var(--color-primary)" }}
        >
          Quiz Complete!
        </h1>
        <p style={{ color: "var(--color-text-secondary)" }}>
          Here's how you performed
        </p>
      </div>

      {/* Score Card */}
      <div className="clay-card p-8 mb-6 text-center">
        <div
          className="text-6xl font-bold mb-2"
          style={{
            color:
              successRate >= 80
                ? "#10B981"
                : successRate >= 60
                  ? "#F59E0B"
                  : "#EF4444",
          }}
        >
          {successRate}%
        </div>
        <p
          className="text-xl mb-4"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {correctAnswers} out of {totalQuestions} correct
        </p>
        <div className="flex justify-center gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className="w-8 h-8"
              style={{
                fill:
                  i < averageConfidence
                    ? "var(--color-primary)"
                    : "transparent",
                color: "var(--color-primary)",
              }}
            />
          ))}
        </div>
        <p
          className="mt-2 text-sm"
          style={{ color: "var(--color-text-muted)" }}
        >
          Average Confidence: {averageConfidence.toFixed(1)}/5
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="clay-card p-4">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-6 h-6" style={{ color: "#10B981" }} />
            <span
              className="text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Correct
            </span>
          </div>
          <p className="text-3xl font-bold" style={{ color: "#10B981" }}>
            {correctAnswers}
          </p>
        </div>

        <div className="clay-card p-4">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-6 h-6" style={{ color: "#EF4444" }} />
            <span
              className="text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Incorrect
            </span>
          </div>
          <p className="text-3xl font-bold" style={{ color: "#EF4444" }}>
            {totalQuestions - correctAnswers}
          </p>
        </div>

        <div className="clay-card p-4">
          <div className="flex items-center gap-3 mb-2">
            <Clock
              className="w-6 h-6"
              style={{ color: "var(--color-primary)" }}
            />
            <span
              className="text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Duration
            </span>
          </div>
          <p
            className="text-3xl font-bold"
            style={{ color: "var(--color-primary)" }}
          >
            {durationMinutes}m
          </p>
        </div>
      </div>

      {/* Question Breakdown */}
      <div className="clay-card p-6 mb-6">
        <h2
          className="text-xl font-bold mb-4"
          style={{ color: "var(--color-primary)" }}
        >
          Question Breakdown
        </h2>
        <div className="space-y-3">
          {session.results.map((result, index) => {
            const question = questions.find((q) => q.id === result.questionId);
            return (
              <div
                key={result.questionId}
                className="flex items-center gap-4 p-4"
                style={{
                  backgroundColor: result.wasCorrect
                    ? "rgba(16, 185, 129, 0.1)"
                    : "rgba(239, 68, 68, 0.1)",
                  borderRadius: "var(--radius-md)",
                  border: result.wasCorrect
                    ? "2px solid #10B981"
                    : "2px solid #EF4444",
                }}
              >
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-full font-bold"
                  style={{
                    backgroundColor: result.wasCorrect ? "#10B981" : "#EF4444",
                    color: "white",
                  }}
                >
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p
                    className="font-medium line-clamp-1"
                    style={{ color: "var(--color-text)" }}
                  >
                    {question?.question || "Question"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {Array.from({ length: result.confidenceRating }).map(
                    (_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4"
                        style={{
                          fill: result.wasCorrect ? "#10B981" : "#EF4444",
                          color: result.wasCorrect ? "#10B981" : "#EF4444",
                        }}
                      />
                    ),
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button
          onClick={() => navigate("/quiz")}
          className="clay-card p-4 flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105 h-auto"
          style={{
            backgroundColor: "var(--color-primary)",
            color: "white",
          }}
        >
          <Target className="w-5 h-5" />
          Start New Quiz
        </Button>
        <Button
          onClick={() => navigate("/progress")}
          className="clay-card p-4 flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105 h-auto"
          style={{
            backgroundColor: "var(--color-accent)",
            color: "white",
          }}
        >
          <TrendingUp className="w-5 h-5" />
          View Progress
        </Button>
      </div>
    </div>
  );
};
