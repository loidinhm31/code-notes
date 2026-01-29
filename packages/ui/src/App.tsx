import { Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import {
  TopicsPage,
  QuestionsPage,
  QuestionDetailPage,
  ImportPage,
  SettingsPage,
  DataManagementPage,
  ProgressDashboardPage,
  QuizModePage,
  QuizSessionPage,
  QuizResultsPage,
} from "@code-notes/ui/pages";
import { ThemeToggle } from "@code-notes/ui/components";

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;

    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  return (
    <div className="min-h-screen-safe bg-background text-foreground">
      {/* Skip to Main Content Link - Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[1001] focus:px-4 focus:py-2 focus:bg-[var(--color-primary)] focus:text-white focus:rounded-lg focus:shadow-[var(--shadow-clay-md)]"
      >
        Skip to main content
      </a>

      {/* Theme Toggle - Fixed Position */}
      <div
        style={{
          position: "fixed",
          top: "1rem",
          right: "1rem",
          zIndex: 1000,
        }}
        className="safe-top safe-right"
      >
        <ThemeToggle />
      </div>

      <main id="main-content">
        <Routes>
          <Route path="/" element={<TopicsPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/data-management" element={<DataManagementPage />} />
          <Route path="/topics/:topicId" element={<QuestionsPage />} />
          <Route
            path="/questions/:questionId"
            element={<QuestionDetailPage />}
          />
          <Route path="/progress" element={<ProgressDashboardPage />} />
          <Route path="/quiz" element={<QuizModePage />} />
          <Route path="/quiz/:sessionId" element={<QuizSessionPage />} />
          <Route
            path="/quiz/results/:sessionId"
            element={<QuizResultsPage />}
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
