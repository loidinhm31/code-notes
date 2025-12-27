import { useState, FormEvent } from "react";
import { useStore } from "@/store";
import type { CreateQuestionDto, UpdateQuestionDto, Question } from "@/types";

interface QuestionFormProps {
  question?: Question;
  topicId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;

export const QuestionForm = ({
  question,
  topicId,
  onSuccess,
  onCancel,
}: QuestionFormProps) => {
  const { addQuestion, updateQuestion, topics } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    topicId: question?.topicId || topicId || "",
    subtopic: question?.subtopic || "",
    questionNumber: question?.questionNumber || 1,
    question: question?.question || "",
    answerMarkdown: question?.answer.markdown || "",
    tags: question?.tags?.join(", ") || "",
    difficulty: question?.difficulty || "intermediate",
    order: question?.order || 0,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (question) {
        // Update existing question - use UpdateQuestionDto
        const updateDto: UpdateQuestionDto = {
          topicId: formData.topicId,
          subtopic: formData.subtopic || undefined,
          questionNumber: formData.questionNumber,
          question: formData.question,
          answer: {
            markdown: formData.answerMarkdown,
          },
          tags: formData.tags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          difficulty: formData.difficulty as
            | "beginner"
            | "intermediate"
            | "advanced",
          order: formData.order,
        };
        await updateQuestion(question.id, updateDto);
      } else {
        // Create new question - use CreateQuestionDto
        const createDto: CreateQuestionDto = {
          topicId: formData.topicId,
          subtopic: formData.subtopic || undefined,
          questionNumber: formData.questionNumber,
          question: formData.question,
          answer: {
            markdown: formData.answerMarkdown,
          },
          tags: formData.tags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          difficulty: formData.difficulty as
            | "beginner"
            | "intermediate"
            | "advanced",
          order: formData.order,
        };
        await addQuestion(createDto);
      }

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save question");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive text-destructive rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="topicId" className="block text-sm font-medium mb-1">
            Topic *
          </label>
          <select
            id="topicId"
            value={formData.topicId}
            onChange={(e) =>
              setFormData({ ...formData, topicId: e.target.value })
            }
            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            required
          >
            <option value="">Select a topic</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="subtopic" className="block text-sm font-medium mb-1">
            Subtopic (optional)
          </label>
          <input
            type="text"
            id="subtopic"
            value={formData.subtopic}
            onChange={(e) =>
              setFormData({ ...formData, subtopic: e.target.value })
            }
            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g., Advanced Java"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="questionNumber"
            className="block text-sm font-medium mb-1"
          >
            Question Number *
          </label>
          <input
            type="number"
            id="questionNumber"
            value={formData.questionNumber}
            onChange={(e) =>
              setFormData({
                ...formData,
                questionNumber: parseInt(e.target.value),
              })
            }
            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            min="1"
            required
          />
        </div>

        <div>
          <label
            htmlFor="difficulty"
            className="block text-sm font-medium mb-1"
          >
            Difficulty *
          </label>
          <select
            id="difficulty"
            value={formData.difficulty}
            onChange={(e) =>
              setFormData({
                ...formData,
                difficulty: e.target.value as
                  | "beginner"
                  | "intermediate"
                  | "advanced",
              })
            }
            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            required
          >
            {DIFFICULTIES.map((diff) => (
              <option key={diff} value={diff}>
                {diff}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="question" className="block text-sm font-medium mb-1">
          Question *
        </label>
        <textarea
          id="question"
          value={formData.question}
          onChange={(e) =>
            setFormData({ ...formData, question: e.target.value })
          }
          className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
          required
          placeholder="Enter the question..."
        />
      </div>

      <div>
        <label
          htmlFor="answerMarkdown"
          className="block text-sm font-medium mb-1"
        >
          Answer (Markdown with code blocks) *
        </label>
        <textarea
          id="answerMarkdown"
          value={formData.answerMarkdown}
          onChange={(e) =>
            setFormData({ ...formData, answerMarkdown: e.target.value })
          }
          className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring min-h-[300px] font-mono text-sm"
          required
          placeholder='Use **bold**, lists, etc. Add code blocks using ```language syntax:

Example:
**Answer:**
Some explanation here...

```java
public class Example {
    public static void main(String[] args) {
        System.out.println("Hello World");
    }
}
```'
        />
      </div>

      <div>
        <label htmlFor="tags" className="block text-sm font-medium mb-1">
          Tags (comma-separated)
        </label>
        <input
          type="text"
          id="tags"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="e.g., async, concurrency, multithreading"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-input rounded-md hover:bg-accent transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="clay-button disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? "Saving..."
            : question
              ? "Update Question"
              : "Create Question"}
        </button>
      </div>
    </form>
  );
};
