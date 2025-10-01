// src/pages/ConfigEmployeesPage.jsx
import React, { useState, useMemo } from "react";
import { useAuth } from "../utils/authData";
import UploadEmployeeDocsForRole from "../components/UploadEmployeeDocsForRole";
import ConfigAdministrationPage from "./ConfigAdministrationPage";

const hasAll = (arr = []) => arr.includes("all_pages") || arr.includes("*");
const canEditDocs = (arr = []) =>
  hasAll(arr) || arr.includes("config_documents") || arr.includes("config_root");

export default function ConfigEmployeesPage() {
  const { user } = useAuth();
  const allowed = useMemo(
    () => (Array.isArray(user?.allowed_pages) ? user.allowed_pages : []),
    [user]
  );
  const canEdit = useMemo(() => canEditDocs(allowed), [allowed]);

  const [tab, setTab] = useState("docs");

  return (
    <div className="p-6 max-w-6xl mx-auto" style={{ filter: "drop-shadow(0 0 8px rgba(0,0,0,.30))" }}>
      <h2 className="text-2xl font-bold mb-6 text-center">Gestão de Colaboradores</h2>

      {/* Abas */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          className={`px-4 py-2 font-bold ${
            tab === "docs"
              ? "border-b-2 border-primary text-primary"
              : "text-gray-500 hover:text-primary"
          }`}
          onClick={() => setTab("docs")}
        >
          Documentos
        </button>
        <button
          className={`px-4 py-2 font-bold ${
            tab === "colabs"
              ? "border-b-2 border-primary text-primary"
              : "text-gray-500 hover:text-primary"
          }`}
          onClick={() => setTab("colabs")}
        >
          Administração
        </button>
      </div>

      {/* Conteúdo */}
      {tab === "colabs" && <ConfigAdministrationPage />}
      {tab === "docs" && (
        <UploadEmployeeDocsForRole
          roleId={user?.role_id}
          roleName={user?.role}
          onUploaded={() => {}}
        />
      )}
    </div>
  );
}
