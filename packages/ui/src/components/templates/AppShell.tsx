import { lazy, Suspense, useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import {
  ErrorBoundary,
  LoadingSpinner,
  ThemeToggle,
} from "@code-notes/ui/components/atoms";
import { useAuth } from "@code-notes/ui/hooks";
import { LoginPage } from "@code-notes/ui/components/pages";

const TopicsPage = lazy(() =>
  import("@code-notes/ui/components/pages").then((m) => ({
    default: m.TopicsPage,
  })),
);
const ImportPage = lazy(() =>
  import("@code-notes/ui/components/pages").then((m) => ({
    default: m.ImportPage,
  })),
);
const SettingsPage = lazy(() =>
  import("@code-notes/ui/components/pages").then((m) => ({
    default: m.SettingsPage,
  })),
);
const DataManagementPage = lazy(() =>
  import("@code-notes/ui/components/pages").then((m) => ({
    default: m.DataManagementPage,
  })),
);
const QuestionsPage = lazy(() =>
  import("@code-notes/ui/components/pages").then((m) => ({
    default: m.QuestionsPage,
  })),
);
const QuestionDetailPage = lazy(() =>
  import("@code-notes/ui/components/pages").then((m) => ({
    default: m.QuestionDetailPage,
  })),
);
const ProgressDashboardPage = lazy(() =>
  import("@code-notes/ui/components/pages").then((m) => ({
    default: m.ProgressDashboardPage,
  })),
);
const QuizModePage = lazy(() =>
  import("@code-notes/ui/components/pages").then((m) => ({
    default: m.QuizModePage,
  })),
);
const QuizSessionPage = lazy(() =>
  import("@code-notes/ui/components/pages").then((m) => ({
    default: m.QuizSessionPage,
  })),
);
const QuizResultsPage = lazy(() =>
  import("@code-notes/ui/components/pages").then((m) => ({
    default: m.QuizResultsPage,
  })),
);

export interface AppShellProps {
  skipAuth?: boolean;
  embedded?: boolean;
  onLogoutRequest?: () => void;
}

export function AppShell({
  skipAuth: skipAuthProp = false,
  embedded = false,
  onLogoutRequest,
}: AppShellProps) {
  const [localSkipAuth, setLocalSkipAuth] = useState(false);

  const {
    isAuthenticated,
    isLoading: isAuthLoading,
    checkAuthStatus,
  } = useAuth({ skipInitialCheck: skipAuthProp });

  // Theme initialization
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;

    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  const skipAuth = skipAuthProp || localSkipAuth;

  // Loading state
  if (isAuthLoading && !skipAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  // Login gate
  if (!isAuthenticated && !skipAuth) {
    return (
      <LoginPage
        onLoginSuccess={() => {
          checkAuthStatus();
        }}
        onSkip={() => setLocalSkipAuth(true)}
      />
    );
  }

  const handleLogout = () => {
    if (onLogoutRequest) {
      onLogoutRequest();
    }
    setLocalSkipAuth(false);
    checkAuthStatus();
  };

  return (
    <div className="min-h-screen-safe bg-background text-foreground">
      {/* Theme Toggle - only in standalone mode */}
      {!embedded && (
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
      )}

      <main id="main-content" className={embedded ? "pt-2 pb-2" : undefined}>
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="" element={<TopicsPage />} />
              <Route path="import" element={<ImportPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="data-management" element={<DataManagementPage />} />
              <Route path="topics/:topicId" element={<QuestionsPage />} />
              <Route
                path="questions/:questionId"
                element={<QuestionDetailPage />}
              />
              <Route path="progress" element={<ProgressDashboardPage />} />
              <Route path="quiz" element={<QuizModePage />} />
              <Route path="quiz/:sessionId" element={<QuizSessionPage />} />
              <Route
                path="quiz/results/:sessionId"
                element={<QuizResultsPage />}
              />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}
