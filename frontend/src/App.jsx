import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import DashboardLayout from "./pages/DashboardLayout";
import FeedbackPage from "./pages/FeedbackPage";
import SummarizerPage from "./pages/SummarizerPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import HistoryPage from "./pages/HistoryPage";
import RubricPage from "./pages/RubricPage";
import BatchFeedbackPage from "./pages/BatchFeedbackPage";

function App() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem("teacher_toolkit_user");
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch { localStorage.removeItem("teacher_toolkit_user"); }
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem("teacher_toolkit_user", JSON.stringify(userData));
    navigate("/dashboard/feedback");
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("teacher_toolkit_user");
    navigate("/");
  };

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<LandingPage user={user} />} />
        <Route path="/auth" element={
          user ? <Navigate to="/dashboard/feedback" /> : <AuthPage onLogin={handleLogin} />
        } />
        <Route path="/dashboard" element={
          user ? <DashboardLayout user={user} onLogout={handleLogout} /> : <Navigate to="/auth" />
        }>
          <Route index element={<Navigate to="feedback" />} />
          <Route path="feedback" element={<FeedbackPage user={user} />} />
          <Route path="batch" element={<BatchFeedbackPage user={user} />} />
          <Route path="summarizer" element={<SummarizerPage user={user} />} />
          <Route path="rubrics" element={<RubricPage user={user} />} />
          <Route path="analytics" element={<AnalyticsPage user={user} />} />
          <Route path="history" element={<HistoryPage user={user} />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
