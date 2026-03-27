import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import type { Topic } from "@code-notes/shared";
import { useStore } from "@code-notes/ui/store";
import { useNav } from "@code-notes/ui/hooks";
import { stripMarkdown } from "../../utils/strip-markdown";
import type { SearchResultItem } from "../../store/slices/searchSlice";

type Difficulty = "beginner" | "intermediate" | "advanced";

function difficultyStyle(difficulty: Difficulty): string {
  if (difficulty === "beginner") return "var(--color-mint)";
  if (difficulty === "advanced") return "var(--color-lavender)";
  return "var(--color-peach)";
}

function SearchResultCard({ item }: { item: SearchResultItem }) {
  const { to } = useNav();
  const rawAnswer = item.question.answer?.markdown ?? "";
  const stripped = rawAnswer ? stripMarkdown(rawAnswer) : "";
  const answerSnippet = stripped
    ? stripped.slice(0, 120).trimEnd() + (stripped.length > 120 ? "…" : "")
    : null;

  return (
    <Link
      to={to(`/questions/${item.question.id}`)}
      className="block no-underline mb-2 transition-shadow duration-150 hover:shadow-[var(--shadow-clay-hover)]"
      style={{
        background: "var(--color-bg-white)",
        borderRadius: "var(--radius-lg)",
        border: "2px solid var(--color-border-light)",
        boxShadow: "var(--shadow-clay-sm)",
        padding: "12px",
        textDecoration: "none",
      }}
    >
      <p
        className="text-sm font-semibold mb-1 line-clamp-2"
        style={{
          color: "var(--color-text-primary)",
          fontFamily: "var(--font-family-heading)",
        }}
      >
        {item.question.question}
      </p>

      {answerSnippet && (
        <p
          className="text-xs mb-2 line-clamp-2"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {answerSnippet}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1">
        {item.topicName && (
          <span
            className="text-xs font-medium px-2 py-0.5"
            style={{
              background: "var(--color-secondary-light)",
              color: "var(--color-primary)",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--color-secondary)",
            }}
          >
            {item.topicName}
          </span>
        )}
        {item.question.difficulty && (
          <span
            className="text-xs font-semibold px-2 py-0.5"
            style={{
              backgroundColor: difficultyStyle(item.question.difficulty),
              color: "var(--color-text-primary)",
              borderRadius: "var(--radius-xl)",
              border: "2px solid rgba(255, 255, 255, 0.5)",
              boxShadow: "var(--shadow-clay-sm)",
            }}
          >
            {item.question.difficulty}
          </span>
        )}
        {item.question.tags.slice(0, 3).map((tag: string) => (
          <span
            key={tag}
            className="text-xs px-2 py-0.5"
            style={{
              background: "var(--color-bg-muted)",
              color: "var(--color-text-muted)",
              borderRadius: "var(--radius-xl)",
            }}
          >
            {tag}
          </span>
        ))}
        <span
          className="text-xs ml-auto"
          style={{ color: "var(--color-text-muted)", opacity: 0.7 }}
          aria-label={`relevance score ${item.score.toFixed(1)}`}
        >
          {item.score.toFixed(1)}
        </span>
      </div>
    </Link>
  );
}

export function SearchPage() {
  const [inputValue, setInputValue] = useState("");
  const [tagInput, setTagInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    initSearchIndex,
    globalSearch,
    clearSearch,
    setSearchFilters,
    searchResults,
    searchQuery,
    filters,
    topics,
    searchIndexError,
  } = useStore();

  useEffect(() => {
    inputRef.current?.focus();
    initSearchIndex();
    return () => {
      clearSearch();
    };
    // initSearchIndex is idempotent; clearSearch on unmount is intentional cleanup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!inputValue.trim()) {
      clearSearch();
      return;
    }
    const timer = setTimeout(() => globalSearch(inputValue), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue]);

  const handleEscape = useCallback(() => {
    setInputValue("");
    setTagInput("");
    clearSearch();
  }, [clearSearch]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleEscape();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleEscape]);

  const handleTagInputBlur = () => {
    const tags = [
      ...new Set(
        tagInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      ),
    ];
    setSearchFilters({ tags });
  };

  return (
    <div
      className="px-4 py-6 max-w-3xl mx-auto"
      style={{ fontFamily: "var(--font-family-body)" }}
    >
      <h1
        className="text-2xl font-bold mb-5"
        style={{
          color: "var(--color-text-primary)",
          fontFamily: "var(--font-family-heading)",
        }}
      >
        Search
      </h1>

      {/* Search input */}
      <div className="relative mb-4">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
          style={{ color: "var(--color-text-muted)" }}
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          placeholder="Search all questions…"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          aria-label="Search questions"
          aria-describedby="search-hint"
          className="w-full pl-10 pr-4 py-3 text-sm outline-none transition-colors"
          style={{
            background: "var(--color-bg-white)",
            color: "var(--color-text-primary)",
            borderRadius: "var(--radius-md)",
            border: "2px solid var(--color-border-light)",
            boxShadow: "var(--shadow-clay-sm)",
            fontFamily: "var(--font-family-body)",
          }}
          onFocus={(e) =>
            (e.currentTarget.style.borderColor = "var(--color-primary)")
          }
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = "var(--color-border-light)")
          }
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Search filters">
        <select
          value={filters.difficulty ?? ""}
          onChange={(e) =>
            setSearchFilters({
              difficulty:
                (e.target.value as Difficulty) || null,
            })
          }
          aria-label="Filter by difficulty"
          className="text-xs px-3 py-2 outline-none"
          style={{
            background: "var(--color-bg-white)",
            color: "var(--color-text-primary)",
            borderRadius: "var(--radius-md)",
            border: "2px solid var(--color-border-light)",
            boxShadow: "var(--shadow-clay-sm)",
            fontFamily: "var(--font-family-body)",
          }}
        >
          <option value="">All difficulties</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>

        <select
          value={filters.topicId ?? ""}
          onChange={(e) =>
            setSearchFilters({ topicId: e.target.value || null })
          }
          aria-label="Filter by topic"
          className="text-xs px-3 py-2 outline-none"
          style={{
            background: "var(--color-bg-white)",
            color: "var(--color-text-primary)",
            borderRadius: "var(--radius-md)",
            border: "2px solid var(--color-border-light)",
            boxShadow: "var(--shadow-clay-sm)",
            fontFamily: "var(--font-family-body)",
          }}
        >
          <option value="">All topics</option>
          {topics.map((t: Topic) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Tags (comma-separated)"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleTagInputBlur();
          }}
          aria-label="Filter by tags, comma-separated"
          className="text-xs px-3 py-2 outline-none flex-1 min-w-[160px]"
          style={{
            background: "var(--color-bg-white)",
            color: "var(--color-text-primary)",
            borderRadius: "var(--radius-md)",
            border: "2px solid var(--color-border-light)",
            boxShadow: "var(--shadow-clay-sm)",
            fontFamily: "var(--font-family-body)",
          }}
          onFocus={(e) =>
            (e.currentTarget.style.borderColor = "var(--color-primary)")
          }
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--color-border-light)";
            handleTagInputBlur();
          }}
        />
      </div>

      {/* Error state */}
      {searchIndexError && (
        <div
          className="text-sm px-4 py-3 mb-4"
          role="alert"
          style={{
            background: "var(--color-lavender)",
            color: "var(--color-error)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-error)",
          }}
        >
          Failed to build search index: {searchIndexError}
        </div>
      )}

      {/* Results / empty states */}
      <div aria-live="polite" aria-atomic="true">
        {!inputValue.trim() && (
          <p
            id="search-hint"
            className="text-sm text-center mt-12"
            style={{ color: "var(--color-text-muted)" }}
          >
            Start typing to search all questions
          </p>
        )}

        {inputValue.trim() && searchResults.length === 0 && !searchIndexError && (
          <p
            className="text-sm text-center mt-12"
            style={{ color: "var(--color-text-muted)" }}
          >
            No results for &ldquo;{searchQuery}&rdquo;
          </p>
        )}

        {searchResults.length > 0 && (
          <div>
            <p
              className="text-xs mb-3"
              style={{ color: "var(--color-text-muted)" }}
            >
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
            </p>
            {searchResults.map((item: SearchResultItem) => (
              <SearchResultCard key={item.question.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
