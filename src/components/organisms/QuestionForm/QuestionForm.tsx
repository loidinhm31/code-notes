import { useState, FormEvent } from "react";
import { useStore } from "@/store";
import type { CreateQuestionDto, UpdateQuestionDto, Question } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
          <Label htmlFor="topicId">Topic *</Label>
          <Select
            value={formData.topicId}
            onValueChange={(value) =>
              setFormData({ ...formData, topicId: value })
            }
            required
          >
            <SelectTrigger id="topicId">
              <SelectValue placeholder="Select a topic" />
            </SelectTrigger>
            <SelectContent>
              {topics.map((topic) => (
                <SelectItem key={topic.id} value={topic.id}>
                  {topic.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="subtopic">Subtopic (optional)</Label>
          <Input
            type="text"
            id="subtopic"
            value={formData.subtopic}
            onChange={(e) =>
              setFormData({ ...formData, subtopic: e.target.value })
            }
            placeholder="e.g., Advanced Java"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="questionNumber">Question Number *</Label>
          <Input
            type="number"
            id="questionNumber"
            value={formData.questionNumber}
            onChange={(e) =>
              setFormData({
                ...formData,
                questionNumber: parseInt(e.target.value),
              })
            }
            min="1"
            required
          />
        </div>

        <div>
          <Label htmlFor="difficulty">Difficulty *</Label>
          <Select
            value={formData.difficulty}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                difficulty: value as "beginner" | "intermediate" | "advanced",
              })
            }
            required
          >
            <SelectTrigger id="difficulty">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIFFICULTIES.map((diff) => (
                <SelectItem key={diff} value={diff}>
                  {diff}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="question">Question *</Label>
        <Textarea
          id="question"
          value={formData.question}
          onChange={(e) =>
            setFormData({ ...formData, question: e.target.value })
          }
          className="min-h-[80px]"
          required
          placeholder="Enter the question..."
        />
      </div>

      <div>
        <Label htmlFor="answerMarkdown">
          Answer (Markdown with code blocks) *
        </Label>
        <Textarea
          id="answerMarkdown"
          value={formData.answerMarkdown}
          onChange={(e) =>
            setFormData({ ...formData, answerMarkdown: e.target.value })
          }
          className="min-h-[300px] font-mono text-sm"
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
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input
          type="text"
          id="tags"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="e.g., async, concurrency, multithreading"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading
            ? "Saving..."
            : question
              ? "Update Question"
              : "Create Question"}
        </Button>
      </div>
    </form>
  );
};
