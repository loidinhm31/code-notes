import React, { useEffect, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { unifiedImportService as importService } from "@code-notes/ui/services";
import { useStore } from "@code-notes/ui/store";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { Button } from "@code-notes/ui/components/atoms";
import { ImportResult } from "@code-notes/shared";

export const ImportForm: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [selectedContent, setSelectedContent] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [useMobileInput, setUseMobileInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchQuestions = useStore((state) => state.fetchQuestions);
  const fetchTopics = useStore((state) => state.fetchTopics);

  // Detect if we're on mobile
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(
      navigator.userAgent,
    );
    if (isMobile) {
      setUseMobileInput(true);
    }
  }, []);

  // Handle native file input (works on all platforms including Android)
  const handleFileInputChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      setSelectedFile(file.name);
      setSelectedContent(content);
      setResult(null);
    } catch (error) {
      console.error("Error reading file:", error);
    }
  };

  // Handle Tauri dialog (works on desktop)
  const handleSelectFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Markdown",
            extensions: ["md", "markdown"],
          },
        ],
      });

      if (selected && typeof selected === "string") {
        setSelectedFile(selected);
        setSelectedContent(""); // Will be read during import
        setResult(null);
      }
    } catch (error) {
      console.error("Error selecting file:", error);
      // If Tauri dialog fails (e.g., on Android), switch to mobile input
      setUseMobileInput(true);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      let content = selectedContent;

      // If we don't have content yet (used Tauri dialog on desktop), read it from file path
      if (!content && selectedFile) {
        try {
          content = await readTextFile(selectedFile);
        } catch (error) {
          throw new Error(
            `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      if (!content) {
        throw new Error("No file content available");
      }

      // Import using the file content
      const importResult = await importService.importFromMarkdown(content);
      setResult(importResult);

      // Refresh topics and questions if import was successful
      if (importResult.success) {
        await fetchTopics();
        await fetchQuestions();
      }
    } catch (error) {
      setResult({
        success: false,
        topicsImported: 0,
        questionsImported: 0,
        message: "Import failed",
        errors: [error instanceof Error ? error.message : String(error)],
        topicsDetails: [],
      });
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setSelectedFile("");
    setSelectedContent("");
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div
      className="max-w-2xl mx-auto p-6 rounded-lg shadow-md"
      style={{ backgroundColor: "var(--color-bg-white)" }}
    >
      <h2
        className="text-2xl font-bold mb-6"
        style={{ color: "var(--color-text-primary)" }}
      >
        Import from Markdown
      </h2>

      <div className="mb-6">
        <p
          className="text-sm mb-4"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Import questions and topics from a markdown file. The file should
          follow this format:
        </p>
        <div
          className="p-4 rounded-md text-sm font-mono mb-4"
          style={{ backgroundColor: "var(--color-bg-muted)" }}
        >
          <div style={{ color: "var(--color-text-primary)" }}>
            ## Topic Name
            <br />
            <br />
            ### 1. Question text here?
            <br />
            <br />
            **Answer:**
            <br />
            Answer content here...
            <br />
            <br />
            ```language
            <br />
            code snippet
            <br />
            ```
            <br />
            <br />
            ### 2. Another question?
            <br />
            <br />
            **Answer:**
            <br />
            Answer content...
            <br />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: "var(--color-text-primary)" }}
          >
            Select Markdown File
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={selectedFile}
              readOnly
              placeholder="No file selected"
              className="flex-1 px-3 py-2 border rounded-md"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-bg-muted)",
                color: "var(--color-text-primary)",
              }}
            />
            {useMobileInput ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,.markdown"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="secondary"
                >
                  Browse
                </Button>
              </>
            ) : (
              <Button onClick={handleSelectFile} variant="secondary">
                Browse
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleImport}
            disabled={!selectedFile || importing}
            variant="accent"
            className="flex-1"
          >
            {importing ? "Importing..." : "Import"}
          </Button>
          {selectedFile && (
            <Button onClick={handleReset} disabled={importing} variant="ghost">
              Reset
            </Button>
          )}
        </div>
      </div>

      {result && (
        <div
          className="mt-6 p-4 rounded-md border-2"
          style={{
            backgroundColor: "var(--color-bg-white)",
            borderColor: result.success
              ? "var(--color-success-light)"
              : "var(--color-error-light)",
          }}
        >
          <h3
            className="font-semibold mb-2"
            style={{
              color: result.success
                ? "var(--color-success)"
                : "var(--color-error)",
            }}
          >
            {result.success ? "Import Successful" : "Import Failed"}
          </h3>
          <p
            className="text-sm mb-2"
            style={{
              color: result.success
                ? "var(--color-success)"
                : "var(--color-error)",
            }}
          >
            {result.message}
          </p>
          {result.success && (
            <div
              className="text-sm mb-4"
              style={{ color: "var(--color-success)" }}
            >
              <p>Topics imported: {result.topicsImported}</p>
              <p>Questions imported: {result.questionsImported}</p>
            </div>
          )}
          {result.errors.length > 0 && (
            <div className="mt-2 mb-4">
              <p
                className="text-sm font-semibold mb-1"
                style={{ color: "var(--color-error)" }}
              >
                Errors:
              </p>
              <ul
                className="list-disc list-inside text-sm"
                style={{ color: "var(--color-error)" }}
              >
                {result.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Detailed breakdown by topic */}
          {result.success &&
            result.topicsDetails &&
            result.topicsDetails.length > 0 && (
              <div
                className="mt-4 border-t pt-4"
                style={{ borderColor: "var(--color-success-light)" }}
              >
                <h4
                  className="font-semibold mb-3"
                  style={{ color: "var(--color-success)" }}
                >
                  Import Details
                </h4>
                <div className="space-y-4">
                  {result.topicsDetails.map((topic) => (
                    <div
                      key={topic.topicId}
                      className="border rounded-md p-3"
                      style={{
                        backgroundColor: "var(--color-bg-white)",
                        borderColor: "var(--color-success-light)",
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h5
                          className="font-medium"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {topic.topicName}
                        </h5>
                        <span
                          className="text-xs px-2 py-1 rounded"
                          style={{
                            backgroundColor: "var(--color-bg-muted)",
                            color: "var(--color-success)",
                          }}
                        >
                          {topic.questionsCount} question
                          {topic.questionsCount !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {topic.questions.length > 0 && (
                        <ul
                          className="mt-2 space-y-1 text-sm"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          {topic.questions.map((question) => (
                            <li
                              key={question.questionId}
                              className="flex items-start gap-2 pl-2"
                            >
                              <span
                                className="font-mono text-xs mt-0.5"
                                style={{ color: "var(--color-success)" }}
                              >
                                {question.questionNumber}.
                              </span>
                              <span className="flex-1">
                                {question.question}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
};
