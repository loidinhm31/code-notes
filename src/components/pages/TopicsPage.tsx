import { useEffect, useState } from "react";
import { useStore } from "@/store";
import { Link } from "react-router-dom";
import { Plus, Upload, Settings, Edit, Trash2 } from "lucide-react";
import { Modal } from "@/components/molecules/Modal/Modal";
import { TopicForm } from "@/components/organisms/TopicForm/TopicForm";
import type { Topic } from "@/types";

export const TopicsPage = () => {
  const {
    topics,
    topicsSearchResults,
    searchKeyword,
    loading,
    error,
    fetchTopics,
    searchTopics,
    clearTopicsSearch,
    deleteTopic
  } = useStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [deletingTopic, setDeletingTopic] = useState<Topic | null>(null);
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const handleDelete = async () => {
    if (deletingTopic) {
      try {
        await deleteTopic(deletingTopic.id);
        setDeletingTopic(null);
        fetchTopics();
      } catch (err) {
        console.error("Failed to delete topic:", err);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center clay-card p-8">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-4 mx-auto"
            style={{ borderColor: "var(--color-primary)" }}
          ></div>
          <p className="mt-4" style={{ color: "var(--color-text-muted)" }}>
            Loading topics...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    // Check if error is related to database configuration
    const isDatabaseConfigError =
      error.toLowerCase().includes("database") ||
      error.toLowerCase().includes("not configured") ||
      error.toLowerCase().includes("mongodb") ||
      error.toLowerCase().includes("managed state") ||
      error.toLowerCase().includes("failed to fetch topics") ||
      error.toLowerCase().includes("failed to resolve") ||
      error.toLowerCase().includes("state");

    if (isDatabaseConfigError) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center clay-card p-8 max-w-md">
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
            >
              <Settings
                className="w-8 h-8"
                style={{ color: "var(--color-primary)" }}
              />
            </div>
            <h2
              className="text-2xl font-bold mb-3"
              style={{ color: "var(--color-primary)" }}
            >
              Database Not Configured
            </h2>
            <p
              className="mb-6 text-sm"
              style={{ color: "var(--color-text-muted)" }}
            >
              Please configure your MongoDB connection in Settings to start
              using the app.
            </p>
            <Link
              to="/settings"
              className="clay-button clay-button-accent inline-flex items-center gap-2"
            >
              <Settings className="w-5 h-5" />
              Go to Settings
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center clay-card p-8">
          <p style={{ color: "var(--color-accent)" }}>Error: {error}</p>
          <button onClick={() => fetchTopics()} className="mt-4 clay-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h1
            className="text-4xl font-bold mb-2"
            style={{ color: "var(--color-primary)" }}
          >
            Topics
          </h1>
          <p style={{ color: "var(--color-text-muted)" }}>
            Browse questions by topic
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/settings"
            className="clay-button flex items-center gap-2"
          >
            <Settings className="w-5 h-5" />
            <span className="hidden sm:inline">Settings</span>
          </Link>
          <Link
            to="/import"
            className="clay-button clay-button-accent flex items-center gap-2"
          >
            <Upload className="w-5 h-5" />
            <span className="hidden sm:inline">Import</span>
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="clay-button flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Create Topic</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="mb-6 w-full max-w-md">
        <div className="relative">
          <input
            type="text"
            placeholder="Search topics by name or description..."
            value={searchInput}
            onChange={(e) => {
              const value = e.target.value;
              setSearchInput(value);
              // Auto-clear search when input is emptied
              if (value === "" && searchKeyword) {
                clearTopicsSearch();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchInput.trim()) {
                searchTopics(searchInput.trim());
              } else if (e.key === 'Escape') {
                setSearchInput("");
                clearTopicsSearch();
              }
            }}
            className="clay-input w-full pr-24"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput("");
                clearTopicsSearch();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-sm"
              style={{ color: "var(--color-text-muted)" }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Search Results Indicator */}
      {searchKeyword && (
        <div className="mb-4">
          <p style={{ color: "var(--color-text-muted)" }}>
            Found {topicsSearchResults.length} topics matching "{searchKeyword}"
          </p>
        </div>
      )}

      {(() => {
        const displayTopics = searchKeyword ? topicsSearchResults : topics;

        return displayTopics.length === 0 ? (
          <div className="text-center py-12 clay-card p-8 max-w-md mx-auto">
            <p style={{ color: "var(--color-text-muted)" }} className="mb-4">
              {searchKeyword
                ? `No topics found matching "${searchKeyword}"`
                : "No topics yet. Create your first topic to get started!"}
            </p>
            {!searchKeyword && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="clay-button"
              >
                Create Topic
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayTopics.map((topic) => (
            <div key={topic.id} className="clay-card p-6 relative group">
              {/* Action buttons */}
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingTopic(topic);
                  }}
                  className="p-2 rounded-md hover:bg-accent transition-colors"
                  title="Edit topic"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingTopic(topic);
                  }}
                  className="p-2 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                  title="Delete topic"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Clickable card content */}
              <Link
                to={`/topics/${topic.id}`}
                className="block cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-14 h-14 flex items-center justify-center text-white font-bold text-xl"
                    style={{
                      backgroundColor: topic.color,
                      borderRadius: "var(--radius-lg)",
                      border: "3px solid rgba(255, 255, 255, 0.5)",
                      boxShadow: "var(--shadow-clay-sm)",
                    }}
                  >
                    {topic.icon || topic.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1 text-lg">{topic.name}</h3>
                    <p
                      className="text-sm line-clamp-2"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {topic.description}
                    </p>
                  </div>
                </div>
                {topic.subtopics && topic.subtopics.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {topic.subtopics.slice(0, 3).map((subtopic, idx) => (
                      <span key={idx} className="clay-badge text-xs">
                        {subtopic}
                      </span>
                    ))}
                    {topic.subtopics.length > 3 && (
                      <span
                        className="text-xs px-2 py-1"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        +{topic.subtopics.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </Link>
            </div>
          ))}
        </div>
        );
      })()}

      {/* Create Topic Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Topic"
      >
        <TopicForm
          onSuccess={() => {
            setShowCreateModal(false);
            fetchTopics();
          }}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Edit Topic Modal */}
      <Modal
        isOpen={!!editingTopic}
        onClose={() => setEditingTopic(null)}
        title="Edit Topic"
      >
        <TopicForm
          topic={editingTopic || undefined}
          onSuccess={() => {
            setEditingTopic(null);
            fetchTopics();
          }}
          onCancel={() => setEditingTopic(null)}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingTopic}
        onClose={() => setDeletingTopic(null)}
        title="Delete Topic"
      >
        <div className="space-y-4">
          <p style={{ color: "var(--color-text-primary)" }}>
            Are you sure you want to delete <strong>{deletingTopic?.name}</strong>?
            This will also delete all questions in this topic. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeletingTopic(null)}
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
