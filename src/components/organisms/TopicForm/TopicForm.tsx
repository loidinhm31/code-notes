import { useState, FormEvent } from "react";
import { useStore } from "@/store";
import type { CreateTopicDto, UpdateTopicDto, Topic } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
          slug:
            formData.slug || formData.name.toLowerCase().replace(/\s+/g, "-"),
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
          slug:
            formData.slug || formData.name.toLowerCase().replace(/\s+/g, "-"),
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
    <form onSubmit={handleSubmit} className="space-y-4 mx-4">
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
        <Label htmlFor="name">Name *</Label>
        <Input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          required
          placeholder="e.g., Java & Core Programming"
        />
      </div>

      <div>
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          className="min-h-[100px]"
          required
          placeholder="Brief description of this topic"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="icon">Icon / Emoji</Label>
          <Input
            type="text"
            id="icon"
            value={formData.icon}
            onChange={(e) => handleChange("icon", e.target.value)}
            placeholder="☕ or text"
            maxLength={2}
          />
        </div>

        <div>
          <Label htmlFor="color">Color</Label>
          <div className="flex gap-2">
            <input
              type="color"
              id="color"
              value={formData.color}
              onChange={(e) => handleChange("color", e.target.value)}
              className="w-14 h-12 cursor-pointer rounded-[var(--radius-md)] border-[3px] border-[var(--color-border)] shadow-[var(--shadow-clay-sm)]"
            />
            <Input
              type="text"
              value={formData.color}
              onChange={(e) => handleChange("color", e.target.value)}
              className="flex-1"
              placeholder="#3b82f6"
            />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="slug">Slug (URL-friendly name)</Label>
        <Input
          type="text"
          id="slug"
          value={formData.slug}
          onChange={(e) => handleChange("slug", e.target.value)}
          placeholder="Auto-generated from name"
        />
      </div>

      <div>
        <Label htmlFor="subtopics">Subtopics (comma-separated)</Label>
        <Input
          type="text"
          id="subtopics"
          value={formData.subtopics}
          onChange={(e) => handleChange("subtopics", e.target.value)}
          placeholder="e.g., Fundamentals, Advanced, Design Patterns"
        />
      </div>

      <div>
        <Label htmlFor="order">Sort Order</Label>
        <Input
          type="number"
          id="order"
          value={formData.order}
          onChange={(e) => handleChange("order", parseInt(e.target.value))}
          min="0"
        />
      </div>

      <div className="flex justify-end gap-3 pt-6">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : topic ? "Update Topic" : "Create Topic"}
        </Button>
      </div>
    </form>
  );
};
