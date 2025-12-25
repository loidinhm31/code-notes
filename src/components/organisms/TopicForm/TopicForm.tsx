import { useState, FormEvent } from "react";
import { useStore } from "@/store";
import type { CreateTopicDto, UpdateTopicDto, Topic } from "@/types";

interface TopicFormProps {
  topic?: Topic;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const TopicForm = ({ topic, onSuccess, onCancel }: TopicFormProps) => {
  const { addTopic, updateTopic } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: topic?.name || "",
    description: topic?.description || "",
    slug: topic?.slug || "",
    icon: topic?.icon || "",
    color: topic?.color || "#3b82f6",
    subtopics: topic?.subtopics?.join(", ") || "",
    order: topic?.order || 0,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (topic) {
        // Update existing topic - use UpdateTopicDto
        const updateDto: UpdateTopicDto = {
          name: formData.name,
          description: formData.description,
          slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, "-"),
          icon: formData.icon,
          color: formData.color,
          subtopics: formData.subtopics
            ? formData.subtopics
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : undefined,
          order: formData.order,
        };
        await updateTopic(topic.id, updateDto);
      } else {
        // Create new topic - use CreateTopicDto
        const createDto: CreateTopicDto = {
          name: formData.name,
          description: formData.description,
          slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, "-"),
          icon: formData.icon,
          color: formData.color,
          subtopics: formData.subtopics
            ? formData.subtopics
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : undefined,
          order: formData.order,
        };
        await addTopic(createDto);
      }

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save topic");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          className="p-4 text-sm font-medium"
          style={{
            backgroundColor: "rgba(234, 88, 12, 0.1)",
            color: "var(--color-accent)",
            border: "2px solid var(--color-accent)",
            borderRadius: "var(--radius-md)",
          }}
        >
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-semibold mb-2"
          style={{ color: "var(--color-text-primary)" }}
        >
          Name *
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          className="clay-input w-full"
          required
          placeholder="e.g., Java & Core Programming"
        />
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-semibold mb-2"
          style={{ color: "var(--color-text-primary)" }}
        >
          Description *
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          className="clay-input w-full min-h-[100px]"
          required
          placeholder="Brief description of this topic"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="icon"
            className="block text-sm font-semibold mb-2"
            style={{ color: "var(--color-text-primary)" }}
          >
            Icon / Emoji
          </label>
          <input
            type="text"
            id="icon"
            value={formData.icon}
            onChange={(e) => handleChange("icon", e.target.value)}
            className="clay-input w-full"
            placeholder="☕ or text"
            maxLength={2}
          />
        </div>

        <div>
          <label
            htmlFor="color"
            className="block text-sm font-semibold mb-2"
            style={{ color: "var(--color-text-primary)" }}
          >
            Color
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              id="color"
              value={formData.color}
              onChange={(e) => handleChange("color", e.target.value)}
              className="w-14 h-12 cursor-pointer"
              style={{
                borderRadius: "var(--radius-md)",
                border: "3px solid var(--color-border)",
                boxShadow: "var(--shadow-clay-sm)",
              }}
            />
            <input
              type="text"
              value={formData.color}
              onChange={(e) => handleChange("color", e.target.value)}
              className="clay-input flex-1"
              placeholder="#3b82f6"
            />
          </div>
        </div>
      </div>

      <div>
        <label
          htmlFor="slug"
          className="block text-sm font-semibold mb-2"
          style={{ color: "var(--color-text-primary)" }}
        >
          Slug (URL-friendly name)
        </label>
        <input
          type="text"
          id="slug"
          value={formData.slug}
          onChange={(e) => handleChange("slug", e.target.value)}
          className="clay-input w-full"
          placeholder="Auto-generated from name"
        />
      </div>

      <div>
        <label
          htmlFor="subtopics"
          className="block text-sm font-semibold mb-2"
          style={{ color: "var(--color-text-primary)" }}
        >
          Subtopics (comma-separated)
        </label>
        <input
          type="text"
          id="subtopics"
          value={formData.subtopics}
          onChange={(e) => handleChange("subtopics", e.target.value)}
          className="clay-input w-full"
          placeholder="e.g., Fundamentals, Advanced, Design Patterns"
        />
      </div>

      <div>
        <label
          htmlFor="order"
          className="block text-sm font-semibold mb-2"
          style={{ color: "var(--color-text-primary)" }}
        >
          Sort Order
        </label>
        <input
          type="number"
          id="order"
          value={formData.order}
          onChange={(e) => handleChange("order", parseInt(e.target.value))}
          className="clay-input w-full"
          min="0"
        />
      </div>

      <div className="flex justify-end gap-3 pt-6">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
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
        )}
        <button
          type="submit"
          disabled={loading}
          className="clay-button disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Saving..." : topic ? "Update Topic" : "Create Topic"}
        </button>
      </div>
    </form>
  );
};
