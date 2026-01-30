import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useNav } from "@code-notes/ui/hooks/useNav";
import {
  ArrowLeft,
  Download,
  Upload,
  Database,
  FileText,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { confirm } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import {
  getDataManagementService,
  type DatabaseStats,
} from "@code-notes/ui/adapters";
import { useStore } from "@code-notes/ui/store";
import { Button } from "@code-notes/ui/components";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: Record<string, unknown>;
  }
}

export const DataManagementPage = () => {
  const { to } = useNav();
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error" | "info">(
    "info",
  );
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");

  const { fetchTopics, fetchQuestions } = useStore();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const dbStats = await getDataManagementService().getDatabaseStats();
      setStats(dbStats);
    } catch (error) {
      console.error("Failed to load database stats:", error);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      setStatus("");

      const defaultFilename = `code-notes-backup-${new Date().toISOString().split("T")[0]}.json`;

      // Use platform-specific service logic
      // Tauri service needs a path from dialog
      // Web service handles download internally

      const service = getDataManagementService();
      let exportPath: string | undefined;

      // Check if Tauri (could use isTauri check or just try/catch)
      // Or just call exportDatabase(undefined) and let service handle it?
      // Interface says path?: string.
      // Tauri service throws if path missing. Web ignores it (or uses as filename).

      // We need to know if we should show a dialog.
      // Better approach: Service handles "get path" if needed?
      // Or UI handles logic.
      // UI Logic:
      if (window.__TAURI_INTERNALS__) {
        const filePath = await save({
          filters: [{ name: "JSON", extensions: ["json"] }],
          defaultPath: defaultFilename,
        });
        if (!filePath) {
          setLoading(false);
          return;
        }
        exportPath = filePath;
      } else {
        // Web: use defaultFilename as path (Service uses it as filename)
        exportPath = defaultFilename;
      }

      const result = await service.exportDatabase(exportPath);

      if (result.success) {
        setStatus(
          `Database exported successfully${result.exported_path ? ` to ${result.exported_path}` : ""}`,
        );
        setStatusType("success");
      } else {
        setStatus(`Export failed: ${result.message}`);
        setStatusType("error");
      }
    } catch (error) {
      setStatus(`Export error: ${error}`);
      setStatusType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      if (importMode === "replace") {
        const confirmed = await confirm(
          "This will replace all existing data with the imported data. This action cannot be undone. Continue?",
          {
            title: "Confirm Replace",
            kind: "warning",
          },
        );

        if (!confirmed) {
          return;
        }
      }

      setLoading(true);
      setStatus("");

      // File Selection
      let content = "";

      if (window.__TAURI_INTERNALS__) {
        const selected = await open({
          filters: [{ name: "JSON", extensions: ["json"] }],
          multiple: false,
        });
        if (selected && typeof selected === "string") {
          content = await readTextFile(selected);
        } else {
          setLoading(false);
          return;
        }
      } else {
        // Web: Create a hidden file input or use window.showOpenFilePicker (modern)
        // For compatibility, let's create an input element dynamically
        // Or reuse logic from ImportForm?
        // Let's use a quick Promise-based file input
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";

        content = await new Promise<string>((resolve, reject) => {
          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
              resolve(await file.text());
            } else {
              reject("No file selected");
            }
          };
          input.click();
        });
      }

      const result = await getDataManagementService().importDatabase(
        content,
        importMode === "merge",
      );

      if (result.success) {
        setStatus(
          `Successfully imported ${result.topics_count} topics and ${result.questions_count} questions!`,
        );
        setStatusType("success");

        await fetchTopics();
        await fetchQuestions();
        await loadStats();
      } else {
        setStatus(`Import failed: ${result.message}`);
        setStatusType("error");
      }
    } catch (error) {
      if (error !== "No file selected") {
        setStatus(`Import error: ${error}`);
        setStatusType("error");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <Link
          to={to("settings")}
          className="inline-flex items-center gap-2 text-sm mb-4 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-[var(--color-bg-muted)] border-2 border-transparent hover:border-[var(--color-border-light)] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>

        <h1
          className="text-4xl font-bold mb-2"
          style={{ color: "var(--color-primary)" }}
        >
          Data Management
        </h1>
        <p style={{ color: "var(--color-text-muted)" }}>
          Import, export, and manage your application data
        </p>
      </div>

      <div>
        {/* Database Statistics */}
        {stats && (
          <div className="clay-card p-6 mb-6">
            <div className="flex items-start gap-4">
              <Database
                className="w-6 h-6"
                style={{ color: "var(--color-primary)" }}
              />
              <div className="flex-1">
                <h2 className="text-2xl font-semibold mb-4">
                  Database Statistics
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="clay-card p-4">
                    <div
                      className="text-sm"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Topics
                    </div>
                    <div
                      className="text-3xl font-bold"
                      style={{ color: "var(--color-primary)" }}
                    >
                      {stats.topics_count}
                    </div>
                  </div>
                  <div className="clay-card p-4">
                    <div
                      className="text-sm"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Questions
                    </div>
                    <div
                      className="text-3xl font-bold"
                      style={{ color: "var(--color-primary)" }}
                    >
                      {stats.questions_count}
                    </div>
                  </div>
                  <div className="clay-card p-4">
                    <div
                      className="text-sm"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Database Size
                    </div>
                    <div
                      className="text-3xl font-bold"
                      style={{ color: "var(--color-primary)" }}
                    >
                      {formatFileSize(stats.database_size)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Export */}
        <div className="clay-card p-6 mb-6">
          <div className="flex items-start gap-4">
            <Download
              className="w-6 h-6"
              style={{ color: "var(--color-primary)" }}
            />
            <div className="flex-1">
              <h2 className="text-2xl font-semibold mb-2">Export Database</h2>
              <p className="mb-4" style={{ color: "var(--color-text-muted)" }}>
                Create a backup of your entire database. This exports all topics
                and questions to a JSON file.
              </p>
              <Button
                onClick={handleExport}
                disabled={loading}
                className="inline-flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export to JSON
              </Button>
            </div>
          </div>
        </div>

        {/* Import */}
        <div className="clay-card p-6 mb-6">
          <div className="flex items-start gap-4">
            <Upload
              className="w-6 h-6"
              style={{ color: "var(--color-primary)" }}
            />
            <div className="flex-1">
              <h2 className="text-2xl font-semibold mb-2">Import Database</h2>
              <p className="mb-4" style={{ color: "var(--color-text-muted)" }}>
                Import data from a JSON backup file. Choose to merge with
                existing data or replace all data.
              </p>

              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block">
                  Import Mode:
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="merge"
                      checked={importMode === "merge"}
                      onChange={(e) =>
                        setImportMode(e.target.value as "merge" | "replace")
                      }
                      className="w-4 h-4"
                    />
                    <span>Merge (add new items, keep existing)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === "replace"}
                      onChange={(e) =>
                        setImportMode(e.target.value as "merge" | "replace")
                      }
                      className="w-4 h-4"
                    />
                    <span>Replace (overwrite all data)</span>
                  </label>
                </div>
              </div>

              <Button
                onClick={handleImport}
                disabled={loading}
                className="inline-flex items-center"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import from JSON
              </Button>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {status && (
          <div
            className={`clay-card p-4 flex items-start gap-3 ${
              statusType === "error"
                ? "border-red-500"
                : statusType === "success"
                  ? "border-green-500"
                  : "border-blue-500"
            } border-l-4`}
          >
            {statusType === "error" && (
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            )}
            {statusType === "success" && (
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            )}
            {statusType === "info" && (
              <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
            )}
            <p className="flex-1">{status}</p>
          </div>
        )}

        {/* Info */}
        <div className="clay-card p-4 border-l-4 border-blue-500">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium mb-1">Data Storage Location</p>
              <p
                className="text-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
                Your data is stored locally in the application data directory.
                The database file is automatically saved after every change.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
