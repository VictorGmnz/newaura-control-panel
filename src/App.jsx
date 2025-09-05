import React, { useEffect, useRef } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import FeedbacksPage from "./pages/FeedbacksPage";
import ReportsPage from "./pages/ReportsPage";
import LoginPage from "./pages/LoginPage";
import ConfigCompanyPage from "./pages/ConfigCompanyPage";
import ConfigDocumentsPage from "./pages/ConfigDocumentsPage";
import ConfigAdministrationPage from "./pages/ConfigAdministrationPage";
import RealTimeMessagesPage from "./pages/RealTimeMessagesPage";
import ConfigChatbotPage from "./pages/ConfigChatbotPage";
import ConfigDocumentsEmployeesPage from "./pages/ConfigDocumentsEmployeesPage";
import { useAuth } from "./utils/authData";

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 min

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  const hasToken =
    !!token || !!(typeof window !== "undefined" && localStorage.getItem("token"));
  return hasToken ? children : <Navigate to="/login" replace />;
}
function RedirectRoute({ children }) {
  const { token } = useAuth();
  const hasToken =
    !!token || !!(typeof window !== "undefined" && localStorage.getItem("token"));
  return hasToken ? <Navigate to="/" replace /> : children;
}

export default function App() {
  const { logout } = useAuth();
  const timer = useRef(null);

  useEffect(() => {
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
  }, [logout]);

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RedirectRoute>
            <LoginPage />
          </RedirectRoute>
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <>
              <Header />
              <div className="md:ml-56 ml-20 pt-24 px-4 md:px-2 pb-8 bg-gray-100 min-h-screen">
                <Sidebar />
                <main className="flex-1 bg-gray-100 min-h-screen pt-4 px-4 md:px-2 pb-8">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/conversas-ativas" element={<RealTimeMessagesPage />} />
                    <Route path="/feedbacks" element={<FeedbacksPage />} />
                    <Route path="/relatorios" element={<ReportsPage />} />
                    {/* Configurações */}
                    <Route path="/configuracoes/empresa" element={<ConfigCompanyPage />} />
                    {/* Clientes → UploadDocuments apenas */}
                    <Route path="/configuracoes/documentos" element={<ConfigDocumentsPage />} />
                    {/* Setor específico → upload + listagem */}
                    <Route
                      path="/configuracoes/documentos/setor/:roleId"
                      element={<ConfigDocumentsEmployeesPage />}
                    />
                    <Route path="/configuracoes/administração" element={<ConfigAdministrationPage />}/>
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
