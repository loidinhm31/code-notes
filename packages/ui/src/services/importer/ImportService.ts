import type {
  ITopicsService,
  IQuestionsService,
  ImportResult,
} from "../interfaces";
import { getTopicsService, getQuestionsService } from "../ServiceFactory";

// Regex for parsing the markdown format
// Matches: ## Topic Name
// Matches: ### Question?
// Matches: **Answer:** Answer text
// Matches: ```code```
const TOPIC_REGEX = /^##\s+(.+)$/gm;

interface ParsedQuestion {
  question: string;
  answer: string;
  code_snippet?: string;
  language?: string;
}

interface ParsedTopic {
  name: string;
  questions: ParsedQuestion[];
}

export class ImportService {
  // This could also be an interface function, but for now it's a helper class
  // that uses the injected services.

  async importFromMarkdown(content: string): Promise<ImportResult> {
    const topicsService = getTopicsService();
    const questionsService = getQuestionsService();

    const result: ImportResult = {
      success: true,
      topics_imported: 0,
      questions_imported: 0,
      message: "Import completed successfully",
      errors: [],
      topics_details: [],
    };

    try {
      const parsedTopics = this.parseMarkdown(content);

      for (const topicData of parsedTopics) {
        try {
          // Create Topic
          const topicId = await topicsService.create({
            name: topicData.name,
            description: "Imported from markdown",
            slug: topicData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            icon: "book", // Default
            color: "#3b82f6", // Default blue
            order: 0,
            subtopics: [],
          });

          result.topics_imported++;

          const topicDetail = {
            topic_id: topicId,
            topic_name: topicData.name,
            questions_count: 0,
            questions: [] as any[],
          };

          // Create Questions
          let qIndex = 1;
          for (const qData of topicData.questions) {
            // Combine code snippet into markdown if present
            let mkAnswer = qData.answer;
            if (qData.code_snippet) {
              const lang = qData.language || "";
              mkAnswer += `\n\n\`\`\`${lang}\n${qData.code_snippet}\n\`\`\``;
            }

            const qId = await questionsService.create({
              topicId: topicId,
              question: qData.question,
              answer: { markdown: mkAnswer },
              tags: [],
              difficulty: "beginner",
              order: qIndex,
              questionNumber: qIndex,
            });
            qIndex++;
            result.questions_imported++;
            topicDetail.questions_count++;
            topicDetail.questions.push({
              question_id: qId,
              question_number: qIndex - 1,
              question: qData.question,
            });
          }
          result.topics_details.push(topicDetail);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          result.errors.push(
            `Failed to import topic '${topicData.name}': ${msg}`,
          );
        }
      }

      if (result.errors.length > 0) {
        result.success = false;
        result.message = "Import completed with errors";
      }
    } catch (error) {
      result.success = false;
      result.message = "Failed to parse or import file";
      result.errors.push(
        error instanceof Error ? error.message : String(error),
      );
    }

    return result;
  }

  private parseMarkdown(content: string): ParsedTopic[] {
    // Simple parser based on the described format
    // Split by "## " to get sections (topics)

    // Normalize newlines
    const normalized = content.replace(/\r\n/g, "\n");
    const sections = normalized
      .split(/^##\s+/m)
      .filter((s) => s.trim().length > 0);

    const topics: ParsedTopic[] = [];

    for (const section of sections) {
      const lines = section.split("\n");
      const topicName = lines[0].trim();
      const body = lines.slice(1).join("\n");

      // Split questions by "### "
      const questionSections = body
        .split(/^###\s+/m)
        .filter((q) => q.trim().length > 0);

      const questions: ParsedQuestion[] = [];

      for (const qSection of questionSections) {
        // First line is question text (handle numbered connection e.g. "1. Question")
        const qLines = qSection.split("\n");
        let qText = qLines[0].trim();
        // Remove leading numbering if present (e.g. "1. ")
        qText = qText.replace(/^\d+\.\s*/, "");

        const qBody = qLines.slice(1).join("\n");

        // Parse Answer
        // Look for "**Answer:**"
        const answerParts = qBody.split(/\*\*Answer:\*\*/i);
        let answer = "";
        let code_snippet: string | undefined;
        let language: string | undefined;

        if (answerParts.length > 1) {
          const answerContent = answerParts[1];

          // Check for code block
          const codeMatch = answerContent.match(/```(\w+)?\n([\s\S]*?)```/);
          if (codeMatch) {
            language = codeMatch[1] || "text";
            code_snippet = codeMatch[2].trim();
            // Remove code block from answer text if desired, or keep it?
            // user requirement probably implies separating it.
            // Let's assume the answer is the text BEFORE or AROUND the code block
            // or simply the whole content.
            // For `code_snippet` field, we extract it.
            // For `answer` field, we might want to clean it or keep as markdown.
            // Let's keep `answer` as the full markdown content of the answer section for now
            // consistent with likely usage in UI (ReactMarkdown).
            answer = answerContent.trim();
            // If we are keeping it as markdown, maybe we don't need to append it again?
            // My Import logic above appends it.
            // Let's try to be smart. If the answerContent already has the code block,
            // we don't need to append it again in the `mkAnswer` construction.
            // BUT `ImportService` above logic: `mkAnswer = qData.answer; if (code_snippet) mkAnswer += ...`
            // If `qData.answer` already contains it, we duplicate it.

            // Refinement: If we successfully extracted code_snippet, we might want to strip it
            // from the 'answer' field here IF we want to re-construct it cleanly.
            // Or just return raw markdown as answer and ignore code_snippet field?
            // The Prompt said "Refactor for function import from json to SQLite or IndexedDB".
            // The existing ImportForm logic seemed to handle it.
            // Let's just pass the raw answerContent (trimmed) as `answer` and NOT populate `code_snippet`
            // if it's already in the markdown.
            // Actually, let's keep it simple: Just take the answer part as markdown.

            code_snippet = undefined; // Don't duplicate
          } else {
            answer = answerContent.trim();
          }
        }

        questions.push({
          question: qText,
          answer,
          code_snippet,
          language,
        });
      }

      topics.push({
        name: topicName,
        questions,
      });
    }

    return topics;
  }
}

export const importService = new ImportService();
