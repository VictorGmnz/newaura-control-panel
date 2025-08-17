import React from "react";
import UploadDocuments from "../components/UploadDocuments";
import UploadEmployeeDocuments from "../components/UploadEmployeeDocuments";

export default function ConfigDocumentsPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">Configuração de Documentos</h2>
      <UploadDocuments />
      <UploadEmployeeDocuments />
    </div>
  );
}
