import { lazy, Suspense, useState } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { ErrorBoundary, LoadingSpinner } from "@code-notes/ui/components/atoms";
import { Sidebar, BottomNavigation } from "@code-notes/ui/components/organisms";
import { useAuth, useNav } from "@code-notes/ui/hooks";
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
const SearchPage = lazy(() =>
  import("@code-notes/ui/components/pages").then((m) => ({
    default: m.SearchPage,
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
  const { to, navigate } = useNav();

  const [localSkipAuth, setLocalSkipAuth] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const { isLoading: isAuthLoading, checkAuthStatus } = useAuth({
    skipInitialCheck: skipAuthProp,
  });

  const skipAuth = skipAuthProp || localSkipAuth;

  // Loading state
  if (isAuthLoading && !skipAuth) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--color-bg-light)" }}
      >
        <LoadingSpinner />
      </div>
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
    <div
      className="min-h-screen-safe text-foreground"
      style={{ background: "var(--color-bg-light)" }}
    >
      {/* Desktop Sidebar - Hidden on mobile */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Page Content - Adjust margins for sidebar on desktop */}
      <main
        id="main-content"
        className={`transition-all duration-300 pt-4 md:pt-6 pb-24 md:pb-6 ${
          isSidebarCollapsed ? "md:ml-16" : "md:ml-64"
        }`}
      >
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="" element={<TopicsPage />} />
              <Route path="import" element={<ImportPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route
                path="login"
                element={
                  <LoginPage
                    onLoginSuccess={() => {
                      checkAuthStatus();
                      navigate("/");
                    }}
                    onSkip={() => {
                      setLocalSkipAuth(true);
                      navigate("/");
                    }}
                  />
                }
              />
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
              <Route path="search" element={<SearchPage />} />
              {/* Fallback redirect */}
              <Route path="*" element={<Navigate to={to("/")} replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Mobile Bottom Navigation - Hidden on desktop */}
      <BottomNavigation />
    </div>
  );
}
