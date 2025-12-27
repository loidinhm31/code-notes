import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TopicsPage } from "./components/pages/TopicsPage";
import { QuestionsPage } from "./components/pages/QuestionsPage";
import { QuestionDetailPage } from "./components/pages/QuestionDetailPage";
import { ImportPage } from "./components/pages/ImportPage";
import { SettingsPage } from "./components/pages/SettingsPage";
import { DataManagementPage } from "./components/pages/DataManagementPage";
import { ProgressDashboardPage } from "./components/pages/ProgressDashboardPage";
import { QuizModePage } from "./components/pages/QuizModePage";
import { QuizSessionPage } from "./components/pages/QuizSessionPage";
import { QuizResultsPage } from "./components/pages/QuizResultsPage";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen-safe bg-background text-foreground">
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
      </div>
    </BrowserRouter>
  );
}

export default App;
