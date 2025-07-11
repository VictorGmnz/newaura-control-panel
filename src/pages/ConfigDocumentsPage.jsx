import React from "react";
import UploadDocuments from "../components/UploadDocuments";

export default function ConfigDocumentsPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Configuração de Documentos</h2>
      <UploadDocuments />
    </div>
  );
}
