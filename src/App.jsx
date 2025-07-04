import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import MessagesPage from "./pages/MessagesPage";
import FeedbacksPage from "./pages/FeedbacksPage";
import ReportsPage from "./pages/ReportsPage";
import LoginPage from "./pages/LoginPage";

function ProtectedRoute({ isLogged, children }) {
  return isLogged ? children : <Navigate to="/login" replace />;
}
function RedirectRoute({ isLogged, children }) {
  return isLogged ? <Navigate to="/" replace /> : children;
}

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in ms

export default function App() {
  const [isLogged, setIsLogged] = useState(false);
  const [loading, setLoading] = useState(true);
  const timer = useRef(null);

  function handleLogout(message) {
    localStorage.removeItem("token");
    setIsLogged(false);
    if (message) alert(message);
  }

  useEffect(() => {
    if (!isLogged) return;
    function resetTimer() {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        handleLogout("Desconectado por inatividade.");
      }, INACTIVITY_TIMEOUT);
    }
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("click", resetTimer);
    resetTimer();
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("click", resetTimer);
    };
  }, [isLogged]);

  useEffect(() => {
    setIsLogged(false);
    localStorage.removeItem("token");
    setLoading(false);
  }, []);

  if (loading) return <div>Carregando...</div>;

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            <RedirectRoute isLogged={isLogged}>
              <LoginPage onLogin={() => setIsLogged(true)} />
            </RedirectRoute>
          }
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute isLogged={isLogged}>
              <>
                <Header />
                <div className="md:ml-56 ml-20 pt-0 px-4 md:px-8 pb-8 bg-gray-100 min-h-screen">
                  <Sidebar />
                  <main className="flex-1 bg-gray-100 min-h-screen pt-4 px-4 md:px-8 pb-8">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/mensagens" element={<MessagesPage />} />
                      <Route path="/feedbacks" element={<FeedbacksPage />} />
                      <Route path="/relatorios" element={<ReportsPage />} />
                      <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                  </main>
                </div>
              </>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}
