import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useStore } from "@code-notes/ui/store";
import type { QuizSessionType } from "@code-notes/shared";
import {
  Play,
  Shuffle,
  List,
  Zap,
  Target,
  BookOpen,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@code-notes/ui/components/ui/button";

export const QuizModePage = () => {
  const navigate = useNavigate();
  const { createQuizSession, fetchTopics, topics, quizLoading } = useStore();

  const [sessionType, setSessionType] = useState<QuizSessionType>("Random");
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<
    "beginner" | "intermediate" | "advanced" | undefined
  >(undefined);
  const [maxQuestions, setMaxQuestions] = useState<number>(20);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const sessionTypes: {
    type: QuizSessionType;
    label: string;
    description: string;
    icon: typeof Shuffle;
  }[] = [
    {
      type: "Random",
      label: "Random Practice",
      description: "Mix questions from all topics",
      icon: Shuffle,
    },
    {
      type: "Sequential",
      label: "Sequential Review",
      description: "Go through questions in order",
      icon: List,
    },
    {
      type: "QuickRefresher",
      label: "Quick Refresher",
      description: "Only previously mastered questions",
      icon: Zap,
    },
    {
      type: "TopicFocused",
      label: "Topic-Focused",
      description: "Select specific topics",
      icon: Target,
    },
    {
      type: "DifficultyFocused",
      label: "Difficulty-Focused",
      description: "Filter by difficulty level",
      icon: BookOpen,
    },
  ];

  const handleStartQuiz = async () => {
    try {
      const session = await createQuizSession({
        sessionType,
        topicIds:
          sessionType === "TopicFocused" && selectedTopicIds.length > 0
            ? selectedTopicIds
            : undefined,
        difficulty:
          sessionType === "DifficultyFocused" ? difficulty : undefined,
        maxQuestions,
      });

      navigate(`/quiz/${session.id}`);
    } catch (error) {
      console.error("Failed to create quiz:", error);
    }
  };

  const toggleTopic = (topicId: string) => {
    setSelectedTopicIds((prev) =>
      prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId],
    );
  };

  const isStartDisabled =
    quizLoading ||
    (sessionType === "TopicFocused" && selectedTopicIds.length === 0) ||
    (sessionType === "DifficultyFocused" && !difficulty);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm mb-4 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-[var(--color-bg-muted)] border-2 border-transparent hover:border-[var(--color-border-light)] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Topics
        </Link>
        <div className="mt-4">
          <h1
            className="text-4xl font-bold mb-2"
            style={{ color: "var(--color-primary)" }}
          >
            Quiz Mode
          </h1>
          <p style={{ color: "var(--color-text-muted)" }}>
            Test your knowledge and track your progress
          </p>
        </div>
      </div>

      {/* Session Type Selection */}
      <div className="clay-card p-6 mb-6">
        <h2
          className="text-xl font-bold mb-4"
          style={{ color: "var(--color-primary)" }}
        >
          Choose Quiz Type
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessionTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = sessionType === type.type;
            return (
              <Button
                key={type.type}
                onClick={() => setSessionType(type.type)}
                variant="ghost"
                className="clay-card p-4 text-left transition-all duration-200 h-auto justify-start"
                style={{
                  backgroundColor: isSelected
                    ? "var(--color-primary)"
                    : "var(--color-bg-card)",
                  border: isSelected
                    ? "2px solid var(--color-primary)"
                    : "2px solid var(--color-border-light)",
                  cursor: "pointer",
                }}
              >
                <div className="flex items-start gap-3">
                  <Icon
                    className="w-6 h-6 mt-1"
                    style={{
                      color: isSelected ? "white" : "var(--color-primary)",
                    }}
                  />
                  <div>
                    <h3
                      className="font-bold mb-1"
                      style={{
                        color: isSelected ? "white" : "var(--color-primary)",
                      }}
                    >
                      {type.label}
                    </h3>
                    <p
                      className="text-sm"
                      style={{
                        color: isSelected
                          ? "rgba(255, 255, 255, 0.9)"
                          : "var(--color-text-secondary)",
                      }}
                    >
                      {type.description}
                    </p>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Topic Selection (for TopicFocused) */}
      {sessionType === "TopicFocused" && (
        <div className="clay-card p-6 mb-6">
          <h2
            className="text-xl font-bold mb-4"
            style={{ color: "var(--color-primary)" }}
          >
            Select Topics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {topics.map((topic) => {
              const isSelected = selectedTopicIds.includes(topic.id);
              return (
                <label
                  key={topic.id}
                  className="flex items-center gap-3 p-3 cursor-pointer transition-all duration-200 clay-card"
                  style={{
                    backgroundColor: isSelected
                      ? "var(--color-primary)"
                      : "var(--color-bg-card)",
                    border: isSelected
                      ? "2px solid var(--color-primary)"
                      : "2px solid var(--color-border-light)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleTopic(topic.id)}
                    className="w-5 h-5"
                  />
                  <span
                    className="text-2xl"
                    style={{
                      color: isSelected ? "white" : topic.color,
                    }}
                  >
                    {topic.icon}
                  </span>
                  <span
                    className="font-medium"
                    style={{
                      color: isSelected ? "white" : "var(--color-text)",
                    }}
                  >
                    {topic.name}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Difficulty Selection (for DifficultyFocused) */}
      {sessionType === "DifficultyFocused" && (
        <div className="clay-card p-6 mb-6">
          <h2
            className="text-xl font-bold mb-4"
            style={{ color: "var(--color-primary)" }}
          >
            Select Difficulty
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(["beginner", "intermediate", "advanced"] as const).map(
              (level) => {
                const isSelected = difficulty === level;
                return (
                  <Button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    variant="ghost"
                    className="clay-card p-4 transition-all duration-200"
                    style={{
                      backgroundColor: isSelected
                        ? "var(--color-primary)"
                        : "var(--color-bg-card)",
                      border: isSelected
                        ? "2px solid var(--color-primary)"
                        : "2px solid var(--color-border-light)",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      className="font-bold capitalize"
                      style={{
                        color: isSelected ? "white" : "var(--color-primary)",
                      }}
                    >
                      {level}
                    </span>
                  </Button>
                );
              },
            )}
          </div>
        </div>
      )}

      {/* Max Questions */}
      <div className="clay-card p-6 mb-6">
        <h2
          className="text-xl font-bold mb-4"
          style={{ color: "var(--color-primary)" }}
        >
          Number of Questions
        </h2>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="5"
            max="65"
            step="5"
            value={maxQuestions}
            onChange={(e) => setMaxQuestions(Number(e.target.value))}
            className="flex-1"
            style={{ accentColor: "var(--color-primary)" }}
          />
          <span
            className="text-2xl font-bold"
            style={{ color: "var(--color-primary)" }}
          >
            {maxQuestions}
          </span>
        </div>
      </div>

      {/* Start Button */}
      <Button
        onClick={handleStartQuiz}
        disabled={isStartDisabled}
        variant="ghost"
        className="w-full clay-card p-6 flex items-center justify-center gap-3 transition-all duration-200 h-auto"
        style={{
          backgroundColor: isStartDisabled
            ? "var(--color-bg-muted)"
            : "var(--color-primary)",
          cursor: isStartDisabled ? "not-allowed" : "pointer",
          opacity: isStartDisabled ? 0.5 : 1,
        }}
      >
        <Play className="w-6 h-6 text-white" />
        <span className="text-xl font-bold text-white">
          {quizLoading ? "Starting Quiz..." : "Start Quiz"}
        </span>
      </Button>
    </div>
  );
};


