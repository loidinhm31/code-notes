import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TopicsPage } from "./components/pages/TopicsPage";
import { QuestionsPage } from "./components/pages/QuestionsPage";
import { QuestionDetailPage } from "./components/pages/QuestionDetailPage";
import { ImportPage } from "./components/pages/ImportPage";
import { SettingsPage } from "./components/pages/SettingsPage";
import { DataManagementPage } from "./components/pages/DataManagementPage";

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
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
