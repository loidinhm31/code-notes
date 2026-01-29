import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "@code-notes/ui/store";
import { ArrowLeft, Plus } from "lucide-react";
import { Modal } from "@code-notes/ui/components/molecules/Modal/Modal";
import { QuestionForm } from "@code-notes/ui/components/organisms/QuestionForm/QuestionForm";
import { Button } from "@code-notes/ui/components/ui/button";
import { Input } from "@code-notes/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@code-notes/ui/components/ui/select";

export const QuestionsPage = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const {
    questions,
    questionsSearchResults,
    searchFilters,
    loading,
    error,
    fetchQuestionsByTopic,
    searchQuestions,
    clearQuestionsSearch,
    topics,
  } = useStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const topic = topics.find((t) => t.id === topicId);

  const getAvailableTags = () => {
    const allTags = new Set<string>();
    questions.forEach((q) => q.tags.forEach((tag) => allTags.add(tag)));
    return Array.from(allTags).sort();
  };

  const handleSearch = () => {
    if (searchInput.trim()) {
      searchQuestions(searchInput.trim(), {
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        topicId: topicId || undefined,
      });
    }
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSelectedTags([]);
    clearQuestionsSearch();
  };

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
          className="inline-flex items-center gap-2 text-sm mb-4 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-[var(--color-bg-muted)] border-2 border-transparent hover:border-[var(--color-border-light)] cursor-pointer"
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
            <Button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Add Question</span>
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filter UI */}
      <div className="mb-6 w-full max-w-2xl">
        <div className="space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Input
              type="text"
              placeholder="Search questions..."
              value={searchInput}
              onChange={(e) => {
                const value = e.target.value;
                setSearchInput(value);
                // Auto-clear search when input is emptied
                if (
                  value === "" &&
                  searchFilters &&
                  selectedTags.length === 0
                ) {
                  clearQuestionsSearch();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchInput.trim()) {
                  handleSearch();
                } else if (e.key === "Escape") {
                  handleClearSearch();
                }
              }}
              className="w-full"
            />
          </div>

          {/* Filters Row */}
          <div className="flex gap-2 flex-wrap items-center">
            {/* Tag Filter */}
            <Select
              value=""
              onValueChange={(value) => {
                if (value && !selectedTags.includes(value)) {
                  setSelectedTags([...selectedTags, value]);
                }
              }}
            >
              <SelectTrigger className="w-[180px] text-sm">
                <SelectValue placeholder="Add tag filter..." />
              </SelectTrigger>
              <SelectContent>
                {getAvailableTags().map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search/Clear Buttons */}
            <Button onClick={handleSearch} size="sm">
              Search
            </Button>
            {(searchInput || selectedTags.length > 0) && (
              <Button onClick={handleClearSearch} variant="ghost" size="sm">
                Clear All
              </Button>
            )}
          </div>

          {/* Selected Tags Display */}
          {selectedTags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {selectedTags.map((tag) => (
                <span key={tag} className="clay-badge flex items-center gap-1">
                  {tag}
                  <Button
                    onClick={() =>
                      setSelectedTags(selectedTags.filter((t) => t !== tag))
                    }
                    variant="ghost"
                    size="icon"
                    className="ml-1 h-auto w-auto p-0 hover:bg-transparent border-0 shadow-none"
                  >
                    Ã—
                  </Button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search Results Indicator */}
      {searchFilters && (
        <div className="mb-4">
          <p style={{ color: "var(--color-text-muted)" }}>
            Found {questionsSearchResults.length} questions
            {searchFilters.keyword && ` matching "${searchFilters.keyword}"`}
          </p>
        </div>
      )}

      {(() => {
        const displayQuestions = searchFilters
          ? questionsSearchResults
          : questions;

        return displayQuestions.length === 0 ? (
          <div className="text-center py-12 clay-card p-8 max-w-md mx-auto">
            <p style={{ color: "var(--color-text-muted)" }} className="mb-4">
              {searchFilters
                ? "No questions found matching your search criteria"
                : "No questions yet. Create your first question!"}
            </p>
            {!searchFilters && (
              <Button onClick={() => setShowCreateModal(true)}>
                Create Question
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayQuestions.map((question) => (
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
        );
      })()}

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

