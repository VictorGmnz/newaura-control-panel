import React, { useEffect, useRef } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import MessagesPage from "./pages/MessagesPage";
import FeedbacksPage from "./pages/FeedbacksPage";
import ReportsPage from "./pages/ReportsPage";
import LoginPage from "./pages/LoginPage";
import ConfigCompanyPage from "./pages/ConfigCompanyPage";
import ConfigDocumentsPage from "./pages/ConfigDocumentsPage";
import ConfigEmployeePage from "./pages/ConfigEmployeePage";
import RealTimeMessagesPage from "./pages/RealTimeMessagesPage";
import ConfigChatbotPage from "./pages/ConfigChatbotPage";
import { useAuth } from "./utils/authData";

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos em ms

function ProtectedRoute({ isLogged, children }) {
  return isLogged ? children : <Navigate to="/login" replace />;
}
function RedirectRoute({ isLogged, children }) {
  return isLogged ? <Navigate to="/" replace /> : children;
}

export default function App() {
  const { token, logout } = useAuth();
  const timer = useRef(null);

  useEffect(() => {
    if (localStorage.getItem("token")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    function resetTimer() {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        logout();
        alert("Desconectado por inatividade.");
        window.location.href = "/login";
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
  }, [token, logout]);

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RedirectRoute isLogged={!!token}>
            <LoginPage />
          </RedirectRoute>
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute isLogged={!!token}>
            <>
              <Header />
              <div className="md:ml-56 ml-20 pt-24 px-4 md:px-2 pb-8 bg-gray-100 min-h-screen">
                <Sidebar />
                <main className="flex-1 bg-gray-100 min-h-screen pt-4 px-4 md:px-2 pb-8">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/mensagens" element={<MessagesPage />} />
                    <Route path="/conversas-ativas" element={<RealTimeMessagesPage />} />
                    <Route path="/feedbacks" element={<FeedbacksPage />} />
                    <Route path="/relatorios" element={<ReportsPage />} />
                    {/* Rotas de Configuração (submenus): */}
                    <Route path="/configuracoes/empresa" element={<ConfigCompanyPage />} />
                    <Route path="/configuracoes/documentos" element={<ConfigDocumentsPage />} />
                    <Route path="/configuracoes/colaboradores" element={<ConfigEmployeePage />} />
                    <Route path="/configuracoes/chatbot" element={<ConfigChatbotPage />} />
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </main>
              </div>
            </>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
