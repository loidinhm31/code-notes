import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useStore } from "@/store";
import { ArrowLeft, Plus } from "lucide-react";
import { Modal } from "@/components/molecules/Modal/Modal";
import { QuestionForm } from "@/components/organisms/QuestionForm/QuestionForm";

export const QuestionsPage = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const { questions, loading, error, fetchQuestionsByTopic, topics } =
    useStore();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const topic = topics.find((t) => t.id === topicId);

  useEffect(() => {
    if (topicId) {
      fetchQuestionsByTopic(topicId);
    }
  }, [topicId, fetchQuestionsByTopic]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center clay-card p-8">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-4 mx-auto"
            style={{ borderColor: "var(--color-primary)" }}
          ></div>
          <p className="mt-4" style={{ color: "var(--color-text-muted)" }}>
            Loading questions...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center clay-card p-8">
          <p style={{ color: "var(--color-accent)" }}>Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm mb-4 clay-button"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Topics
        </Link>
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mt-4">
          <div>
            <h1
              className="text-4xl font-bold mb-2"
              style={{ color: "var(--color-primary)" }}
            >
              {topic?.name || "Questions"}
            </h1>
            {topic && (
              <p style={{ color: "var(--color-text-muted)" }}>
                {topic.description}
              </p>
            )}
          </div>
          {topicId && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="clay-button flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Add Question</span>
            </button>
          )}
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-12 clay-card p-8 max-w-md mx-auto">
          <p style={{ color: "var(--color-text-muted)" }} className="mb-4">
            No questions yet. Create your first question!
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="clay-button"
          >
            Create Question
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question) => (
            <Link
              key={question.id}
              to={`/questions/${question.id}`}
              className="clay-card block p-5 cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div
                  className="min-w-[3rem] h-12 flex items-center justify-center text-white font-bold text-lg"
                  style={{
                    backgroundColor: "var(--color-primary)",
                    borderRadius: "var(--radius-md)",
                    border: "3px solid var(--color-primary-light)",
                    boxShadow: "var(--shadow-clay-sm)",
                  }}
                >
                  {question.questionNumber}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-3 text-lg">
                    {question.question}
                  </h3>
                  <div className="flex flex-wrap gap-2 items-center">
                    {question.tags.map((tag, idx) => (
                      <span key={idx} className="clay-badge text-xs">
                        {tag}
                      </span>
                    ))}
                    <span
                      className="text-xs px-3 py-1 font-semibold"
                      style={{
                        backgroundColor:
                          question.difficulty === "beginner"
                            ? "var(--color-mint)"
                            : question.difficulty === "intermediate"
                              ? "var(--color-peach)"
                              : "var(--color-lavender)",
                        color: "var(--color-text-primary)",
                        borderRadius: "var(--radius-xl)",
                        border: "2px solid rgba(255, 255, 255, 0.5)",
                        boxShadow: "var(--shadow-clay-sm)",
                      }}
                    >
                      {question.difficulty}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {topicId && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New Question"
        >
          <QuestionForm
            topicId={topicId}
            onSuccess={() => {
              setShowCreateModal(false);
              fetchQuestionsByTopic(topicId);
            }}
            onCancel={() => setShowCreateModal(false)}
          />
        </Modal>
      )}
    </div>
  );
};
