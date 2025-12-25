import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useStore } from "@/store";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Type,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { MarkdownRenderer } from "@/components/molecules/MarkdownRenderer/MarkdownRenderer";
import { Modal } from "@/components/molecules/Modal/Modal";
import { QuestionForm } from "@/components/organisms/QuestionForm/QuestionForm";

export const QuestionDetailPage = () => {
  const { questionId } = useParams<{ questionId: string }>();
  const navigate = useNavigate();
  const {
    currentQuestion,
    questions,
    getQuestionById,
    fetchQuestionsByTopic,
    deleteQuestion,
    error,
    fontSize,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize,
  } = useStore();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [prevQuestionId, setPrevQuestionId] = useState<string | null>(null);
  const [nextQuestionId, setNextQuestionId] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestion = async () => {
      if (questionId) {
        setLoading(true);
        try {
          await getQuestionById(questionId);
        } catch (err) {
          console.error("Failed to load question:", err);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchQuestion();
  }, [questionId, getQuestionById]);

  // Fetch questions for the topic and calculate prev/next
  useEffect(() => {
    const fetchTopicQuestions = async () => {
      if (currentQuestion?.topicId) {
        try {
          await fetchQuestionsByTopic(currentQuestion.topicId);
        } catch (err) {
          console.error("Failed to load topic questions:", err);
        }
      }
    };
    fetchTopicQuestions();
  }, [currentQuestion?.topicId, fetchQuestionsByTopic]);

  // Calculate previous and next questions
  useEffect(() => {
    if (currentQuestion && questions.length > 0) {
      const sortedQuestions = [...questions]
        .filter((q) => q.topicId === currentQuestion.topicId)
        .sort((a, b) => a.order - b.order);

      const currentIndex = sortedQuestions.findIndex(
        (q) => q.id === currentQuestion.id,
      );

      if (currentIndex > 0) {
        setPrevQuestionId(sortedQuestions[currentIndex - 1].id);
      } else {
        setPrevQuestionId(null);
      }

      if (currentIndex < sortedQuestions.length - 1) {
        setNextQuestionId(sortedQuestions[currentIndex + 1].id);
      } else {
        setNextQuestionId(null);
      }
    } else {
      setPrevQuestionId(null);
      setNextQuestionId(null);
    }
  }, [currentQuestion, questions]);

  const handleDelete = async () => {
    if (questionId && currentQuestion) {
      try {
        await deleteQuestion(questionId);
        navigate(`/topics/${currentQuestion.topicId}`);
      } catch (err) {
        console.error("Failed to delete question:", err);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading question...</p>
        </div>
      </div>
    );
  }

  if (error || !currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-destructive mb-4">
            {error || "Question not found"}
          </p>
          <button
            onClick={() => navigate("/")}
            className="clay-button"
          >
            Back to Topics
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 px-6 md:px-8 lg:px-12">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link
              to={`/topics/${currentQuestion.topicId}`}
              className="inline-flex items-center gap-2 text-sm clay-button"
              title="Back to Questions"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Questions</span>
            </Link>

            {/* Previous/Next Navigation */}
            <div className="flex items-center gap-1 border border-input rounded-md overflow-hidden">
              <button
                onClick={() =>
                  prevQuestionId && navigate(`/questions/${prevQuestionId}`)
                }
                disabled={!prevQuestionId}
                className="px-2 py-1.5 hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Previous question"
                aria-label="Previous question"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  nextQuestionId && navigate(`/questions/${nextQuestionId}`)
                }
                disabled={!nextQuestionId}
                className="px-2 py-1.5 hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-l border-input"
                title="Next question"
                aria-label="Next question"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex gap-2 ms-2">
            {/* Font Size Controls */}
            <div className="flex items-center border border-input rounded-md overflow-hidden">
              <button
                onClick={decreaseFontSize}
                disabled={fontSize <= 80}
                className="px-2 py-1.5 hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Decrease font size"
                aria-label="Decrease font size"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                onClick={resetFontSize}
                className="px-3 py-1.5 text-sm hover:bg-accent transition-colors flex items-center gap-1 border-x border-input"
                title="Reset font size"
              >
                <Type className="w-4 h-4" />
                <span className="hidden sm:inline">{fontSize}%</span>
              </button>
              <button
                onClick={increaseFontSize}
                disabled={fontSize >= 150}
                className="px-2 py-1.5 hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Increase font size"
                aria-label="Increase font size"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 border border-input rounded-md hover:bg-accent transition-colors"
            >
              <Edit className="w-4 h-4" />
              <span className="hidden sm:inline">Edit</span>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1 px-3 py-1.5 border border-destructive text-destructive rounded-md hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </div>

        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl font-bold text-muted-foreground">
            {currentQuestion.questionNumber}.
          </span>
          <div className="flex-1">
            <h1
              className="text-2xl md:text-3xl font-bold mb-3"
              style={{ fontSize: `${fontSize}%` }}
            >
              {currentQuestion.question}
            </h1>
            <div className="flex flex-wrap gap-2">
              {currentQuestion.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground"
                >
                  {tag}
                </span>
              ))}
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${
                  currentQuestion.difficulty === "beginner"
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                    : currentQuestion.difficulty === "intermediate"
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                }`}
              >
                {currentQuestion.difficulty}
              </span>
              {currentQuestion.subtopic && (
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                  {currentQuestion.subtopic}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-xl font-semibold mb-4">Answer</h2>

        <MarkdownRenderer
          content={currentQuestion.answer.markdown}
          fontSize={fontSize}
        />
      </div>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Question"
      >
        <QuestionForm
          question={currentQuestion}
          onSuccess={() => {
            setShowEditModal(false);
            if (questionId) getQuestionById(questionId);
          }}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Question"
      >
        <div className="space-y-4">
          <p>
            Are you sure you want to delete this question? This action cannot be
            undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="px-6 py-3 font-semibold transition-all duration-200"
              style={{
                backgroundColor: "var(--color-bg-muted)",
                color: "var(--color-text-muted)",
                borderRadius: "var(--radius-md)",
                border: "2px solid var(--color-border-light)",
                boxShadow: "var(--shadow-clay-sm)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-secondary)";
                e.currentTarget.style.color = "var(--color-text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-bg-muted)";
                e.currentTarget.style.color = "var(--color-text-muted)";
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="px-6 py-3 font-semibold transition-all duration-200"
              style={{
                backgroundColor: "var(--color-accent)",
                color: "white",
                borderRadius: "var(--radius-md)",
                border: "3px solid var(--color-accent-dark)",
                boxShadow: "var(--shadow-clay-sm)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-accent-light)";
                e.currentTarget.style.boxShadow = "var(--shadow-clay-md)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-accent)";
                e.currentTarget.style.boxShadow = "var(--shadow-clay-sm)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
