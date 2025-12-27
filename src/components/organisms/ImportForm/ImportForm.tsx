import React, { useState, useRef, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  importService,
  ImportResult,
} from "@/services/tauri/import.service.ts";
import { useStore } from "@/store";
import { readTextFile } from "@tauri-apps/plugin-fs";

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
        topics_imported: 0,
        questions_imported: 0,
        message: "Import failed",
        errors: [error instanceof Error ? error.message : String(error)],
        topics_details: [],
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
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        Import from Markdown
      </h2>

      <div className="mb-6">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Import questions and topics from a markdown file. The file should
          follow this format:
        </p>
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md text-sm font-mono mb-4">
          <div className="text-gray-800 dark:text-gray-200">
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Markdown File
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={selectedFile}
              readOnly
              placeholder="No file selected"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
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
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                >
                  Browse
                </button>
              </>
            ) : (
              <button
                onClick={handleSelectFile}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
              >
                Browse
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleImport}
            disabled={!selectedFile || importing}
            className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md transition-colors"
          >
            {importing ? "Importing..." : "Import"}
          </button>
          {selectedFile && (
            <button
              onClick={handleReset}
              disabled={importing}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {result && (
        <div
          className={`mt-6 p-4 rounded-md ${
            result.success
              ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
          }`}
        >
          <h3
            className={`font-semibold mb-2 ${
              result.success
                ? "text-green-800 dark:text-green-200"
                : "text-red-800 dark:text-red-200"
            }`}
          >
            {result.success ? "Import Successful" : "Import Failed"}
          </h3>
          <p
            className={`text-sm mb-2 ${
              result.success
                ? "text-green-700 dark:text-green-300"
                : "text-red-700 dark:text-red-300"
            }`}
          >
            {result.message}
          </p>
          {result.success && (
            <div className="text-sm text-green-700 dark:text-green-300 mb-4">
              <p>Topics imported: {result.topics_imported}</p>
              <p>Questions imported: {result.questions_imported}</p>
            </div>
          )}
          {result.errors.length > 0 && (
            <div className="mt-2 mb-4">
              <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
                Errors:
              </p>
              <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300">
                {result.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Detailed breakdown by topic */}
          {result.success &&
            result.topics_details &&
            result.topics_details.length > 0 && (
              <div className="mt-4 border-t border-green-200 dark:border-green-800 pt-4">
                <h4 className="font-semibold text-green-800 dark:text-green-200 mb-3">
                  Import Details
                </h4>
                <div className="space-y-4">
                  {result.topics_details.map((topic) => (
                    <div
                      key={topic.topic_id}
                      className="bg-white dark:bg-gray-800 border border-green-100 dark:border-green-900 rounded-md p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-900 dark:text-gray-100">
                          {topic.topic_name}
                        </h5>
                        <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                          {topic.questions_count} question
                          {topic.questions_count !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {topic.questions.length > 0 && (
                        <ul className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                          {topic.questions.map((question) => (
                            <li
                              key={question.question_id}
                              className="flex items-start gap-2 pl-2"
                            >
                              <span className="text-green-600 dark:text-green-400 font-mono text-xs mt-0.5">
                                {question.question_number}.
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
