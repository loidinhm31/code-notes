import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useStore } from "@/store";
import { MarkdownRenderer } from "@/components/molecules/MarkdownRenderer/MarkdownRenderer";
import { ConfidenceRating } from "@/components/molecules/ConfidenceRating/ConfidenceRating";
import {
  ChevronRight,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Flag,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const QuizSessionPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const {
    activeSession,
    quizLoading,
    fetchQuizHistory,
    completeQuiz,
    submitAnswer,
    getCurrentQuestion,
    getQuizProgress,
    questions,
    fetchQuestions,
  } = useStore();

  const [showAnswer, setShowAnswer] = useState(false);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [confidenceRating, setConfidenceRating] = useState(0);

  useEffect(() => {
    if (sessionId && (!activeSession || activeSession.id !== sessionId)) {
      // Load session from backend (would need getSession method)
      fetchQuizHistory();
    }
    fetchQuestions();
  }, [sessionId, activeSession, fetchQuizHistory, fetchQuestions]);

  const currentQuestion = getCurrentQuestion(questions);
  const progress = getQuizProgress();

  // Check if current question has already been answered
  const isAlreadyAnswered =
    currentQuestion && activeSession
      ? activeSession.results.some((r) => r.questionId === currentQuestion.id)
      : false;

  const handleSubmit = async () => {
    if (!currentQuestion || wasCorrect === null || confidenceRating === 0) {
      return;
    }

    // Prevent duplicate submissions
    if (isAlreadyAnswered) {
      console.warn("Question already answered, skipping submission");
      return;
    }

    try {
      await submitAnswer({
        questionId: currentQuestion.id,
        wasCorrect,
        confidenceRating,
        answeredAt: new Date().toISOString(),
      });

      // Reset for next question
      setShowAnswer(false);
      setWasCorrect(null);
      setConfidenceRating(0);
    } catch (error) {
      console.error("Failed to submit answer:", error);
    }
  };

  const handleComplete = async () => {
    try {
      const completed = await completeQuiz();
      navigate(`/quiz/results/${completed.id}`);
    } catch (error) {
      console.error("Failed to complete quiz:", error);
    }
  };

  if (quizLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: "var(--color-primary)" }}
          />
          <p style={{ color: "var(--color-text-secondary)" }}>
            Loading quiz...
          </p>
        </div>
      </div>
    );
  }

  if (!activeSession || !currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p
            className="text-xl mb-4"
            style={{ color: "var(--color-text-secondary)" }}
          >
            No active quiz session
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

  const isLastQuestion = progress.current === progress.total;
  const canSubmit = wasCorrect !== null && confidenceRating > 0;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Link to="/quiz" className="inline-flex items-center gap-2 text-sm mb-6 ">
        <ArrowLeft className="w-4 h-4" />
        Back to Quiz Setup
      </Link>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span style={{ color: "var(--color-text-secondary)" }}>
            Question {progress.current} of {progress.total}
          </span>
          <span className="font-bold" style={{ color: "var(--color-primary)" }}>
            {Math.round((progress.current / progress.total) * 100)}%
          </span>
        </div>
        <div
          className="w-full h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: "var(--color-bg-muted)" }}
        >
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${(progress.current / progress.total) * 100}%`,
              backgroundColor: "var(--color-primary)",
            }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="clay-card p-6 mb-6">
        <div className="flex items-start gap-4 mb-4">
          <div
            className="px-3 py-1 rounded-full text-sm font-bold"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "white",
            }}
          >
            Q{currentQuestion.questionNumber}
          </div>
          <h2
            className="text-2xl font-bold flex-1"
            style={{ color: "var(--color-primary)" }}
          >
            {currentQuestion.question}
          </h2>
        </div>

        {/* Show/Hide Answer Button */}
        <Button
          onClick={() => setShowAnswer(!showAnswer)}
          variant="ghost"
          className="flex items-center gap-2 px-4 py-2 mb-4 clay-card transition-all duration-200"
          style={{
            backgroundColor: showAnswer
              ? "var(--color-primary)"
              : "var(--color-bg-muted)",
            color: showAnswer ? "white" : "var(--color-text)",
          }}
        >
          {showAnswer ? (
            <>
              <EyeOff className="w-5 h-5" />
              Hide Answer
            </>
          ) : (
            <>
              <Eye className="w-5 h-5" />
              Show Answer
            </>
          )}
        </Button>

        {/* Answer */}
        {showAnswer && (
          <div
            className="p-6 rounded-lg"
            style={{
              backgroundColor: "var(--color-bg-muted)",
              border: "2px solid var(--color-border-light)",
            }}
          >
            <MarkdownRenderer content={currentQuestion.answer.markdown} />
          </div>
        )}
      </div>

      {/* Self-Grading Section */}
      {showAnswer && (
        <div className="clay-card p-6 mb-6">
          <h3
            className="text-lg font-bold mb-4"
            style={{ color: "var(--color-primary)" }}
          >
            How did you do?
          </h3>

          {/* Correct/Incorrect */}
          <div className="flex gap-4 mb-6">
            <Button
              onClick={() => setWasCorrect(true)}
              variant="ghost"
              className={`flex-1 flex items-center justify-center gap-2 p-4 clay-card transition-all duration-200 ${
                wasCorrect === true ? "ring-4" : ""
              }`}
              style={{
                backgroundColor:
                  wasCorrect === true ? "#10B981" : "var(--color-bg-card)",
                color: wasCorrect === true ? "white" : "var(--color-text)",
                border:
                  wasCorrect === true
                    ? "2px solid #10B981"
                    : "2px solid var(--color-border-light)",
                outline:
                  wasCorrect === true
                    ? "4px solid rgba(16, 185, 129, 0.5)"
                    : "none",
              }}
            >
              <CheckCircle className="w-6 h-6" />
              <span className="font-bold">Correct</span>
            </Button>
            <Button
              onClick={() => setWasCorrect(false)}
              variant="ghost"
              className={`flex-1 flex items-center justify-center gap-2 p-4 clay-card transition-all duration-200 ${
                wasCorrect === false ? "ring-4" : ""
              }`}
              style={{
                backgroundColor:
                  wasCorrect === false ? "#EF4444" : "var(--color-bg-card)",
                color: wasCorrect === false ? "white" : "var(--color-text)",
                border:
                  wasCorrect === false
                    ? "2px solid #EF4444"
                    : "2px solid var(--color-border-light)",
                outline:
                  wasCorrect === false
                    ? "4px solid rgba(239, 68, 68, 0.5)"
                    : "none",
              }}
            >
              <XCircle className="w-6 h-6" />
              <span className="font-bold">Incorrect</span>
            </Button>
          </div>

          {/* Confidence Rating */}
          <div>
            <p
              className="mb-3 font-medium"
              style={{ color: "var(--color-text-secondary)" }}
            >
              How confident are you?
            </p>
            <ConfidenceRating
              value={confidenceRating}
              onChange={setConfidenceRating}
              size="lg"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center">
        {isLastQuestion ? (
          <Button
            onClick={handleComplete}
            disabled={!canSubmit}
            variant="ghost"
            className="flex items-center gap-2 px-6 py-3 clay-card transition-all duration-200"
            style={{
              backgroundColor: canSubmit
                ? "var(--color-accent)"
                : "var(--color-bg-muted)",
              color: "white",
              cursor: canSubmit ? "pointer" : "not-allowed",
              opacity: canSubmit ? 1 : 0.5,
            }}
          >
            <Flag className="w-5 h-5" />
            Finish Quiz
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            variant="ghost"
            className="flex items-center gap-2 px-6 py-3 clay-card transition-all duration-200"
            style={{
              backgroundColor: canSubmit
                ? "var(--color-primary)"
                : "var(--color-bg-muted)",
              color: "white",
              cursor: canSubmit ? "pointer" : "not-allowed",
              opacity: canSubmit ? 1 : 0.5,
            }}
          >
            Next Question
            <ChevronRight className="w-5 h-5" />
          </Button>
        )}
      </div>
    </div>
  );
};
