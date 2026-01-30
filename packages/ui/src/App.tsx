import { Route, Routes } from "react-router-dom";
import {
  AppLayout,
  DataManagementPage,
  ImportPage,
  ProgressDashboardPage,
  QuestionDetailPage,
  QuestionsPage,
  QuizModePage,
  QuizResultsPage,
  QuizSessionPage,
  SettingsPage,
  TopicsPage,
} from "@code-notes/ui/components";

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="" element={<TopicsPage />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="data-management" element={<DataManagementPage />} />
        <Route path="topics/:topicId" element={<QuestionsPage />} />
        <Route path="questions/:questionId" element={<QuestionDetailPage />} />
        <Route path="progress" element={<ProgressDashboardPage />} />
        <Route path="quiz" element={<QuizModePage />} />
        <Route path="quiz/:sessionId" element={<QuizSessionPage />} />
        <Route path="quiz/results/:sessionId" element={<QuizResultsPage />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
