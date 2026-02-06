import { lazy, Suspense, useState } from "react";
import { Route, Routes, useLocation, Navigate } from "react-router-dom";
import { ErrorBoundary, LoadingSpinner } from "@code-notes/ui/components/atoms";
import { BottomNav } from "@code-notes/ui/components/molecules";
import { Sidebar } from "@code-notes/ui/components/organisms";
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

type Page = "topics" | "quiz" | "progress" | "import" | "settings";

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
  const location = useLocation();
  const { to, nav } = useNav();

  const [localSkipAuth, setLocalSkipAuth] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const {
    isAuthenticated,
    isLoading: isAuthLoading,
    checkAuthStatus,
  } = useAuth({ skipInitialCheck: skipAuthProp });

  // Theme initialization is handled by ThemeProvider in CodeNotesApp

  // Derive current page from path
  const getCurrentPage = (): Page => {
    const path = location.pathname;
    if (path.endsWith("/quiz") || path.includes("/quiz/")) return "quiz";
    if (path.endsWith("/progress") || path === "/progress") return "progress";
    if (path.endsWith("/import") || path === "/import") return "import";
    if (path.endsWith("/settings") || path === "/settings") return "settings";
    return "topics"; // default
  };

  const currentPage = getCurrentPage();

  const handleNavigate = (page: Page) => {
    const pageMap: Record<Page, string> = {
      topics: "",
      quiz: "quiz",
      progress: "progress",
      import: "import",
      settings: "settings",
    };
    nav(pageMap[page] ?? "");
  };

  const skipAuth = skipAuthProp || localSkipAuth;

  // Loading state
  if (isAuthLoading && !skipAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
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

  // Always show navigation - embedded prop is only for theme isolation now
  const showNavigation = true;

  return (
    <div className="min-h-screen-safe bg-background text-foreground">
      {/* Desktop Sidebar - Hidden on mobile */}
      {showNavigation && (
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          onSyncTap={() => handleNavigate("settings")}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      )}

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
                      nav("");
                    }}
                    onSkip={() => {
                      setLocalSkipAuth(true);
                      nav("");
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
              {/* Fallback redirect */}
              <Route path="*" element={<Navigate to={to("")} replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Mobile Bottom Navigation - Hidden on desktop */}
      {showNavigation && (
        <BottomNav currentPage={currentPage} onNavigate={handleNavigate} />
      )}
    </div>
  );
}
