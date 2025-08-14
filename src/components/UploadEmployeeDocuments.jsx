import React, { useEffect, useState, useRef } from "react";
import { authFetch } from "../utils/authFetch";
import { FaTimes } from "react-icons/fa";
import { useAuth } from "../utils/authData";

const API_URL = import.meta.env.VITE_API_URL;

export default function UploadEmployeeDocuments() {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const docsMap = {};
  docs.forEach(doc => {
    const key = `${doc.title}-${doc.file_name}`;
    if (!docsMap[key]) {
      docsMap[key] = doc;
    }
  });
  const docsToShow = Object.values(docsMap);

  useEffect(() => { fetchDocs(); }, []);

  function fetchDocs() {
    authFetch(`${API_URL}/company/documents?company_id=${user.company_id}&is_employee_doc=true`)
      .then(res => res.json())
      .then(data => setDocs(data.documents || []));
  }

  function handleFileChange(e) { setFile(e.target.files[0]); }

  function handleDelete(docId) {
    if (!window.confirm("Confirma exclusão do documento?")) return;
    authFetch(`${API_URL}/company/documents/${docId}?company_id=${user.company_id}&is_employee_doc=true`, { method: "DELETE" })
      .then(res => res.json())
      .then(data => { setMsg(data.message || "Documento excluído!"); fetchDocs(); })
      .catch(() => setError("Erro ao excluir documento."));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setUploading(true); setMsg(""); setError("");
    if (!file || !title) { setError("Título e arquivo são obrigatórios!"); setUploading(false); return; }

    const formData = new FormData();
    formData.append("company_id", user.company_id);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("created_by", 1);
    formData.append("is_employee_doc", "true");
    formData.append("file", file);

    authFetch(`${API_URL}/company/documents/upload`, { method: "POST", body: formData })
      .then(res => res.json())
      .then(data => {
        if (data.detail) setError(data.detail || "Erro ao enviar documento.");
        else {
          setMsg(data.message || "Documento enviado com sucesso!");
          setFile(null); setTitle(""); setDescription("");
          if (fileInputRef.current) fileInputRef.current.value = "";
          fetchDocs();
        }
      })
      .catch(() => setError("Erro no envio do documento."))
      .finally(() => setUploading(false));
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 mt-12 max-w-3xl mx-auto">
      <h3 className="text-xl font-bold text-primary mb-2">📄 Documentos dos Colaboradores</h3>
      <p className="text-gray-500 mb-4">
        Os documentos inseridos aqui serão utilizados exclusivamente para o Chatbot responder mensagem de seus colaboradores (ex: manuais, políticas, prática internas, etc).
      </p>
      <p className="text-yellow-600 mb-4">
        Envie arquivos PDF, DOCX ou XLSX (máx. 10MB). Para maior precisão, prefira arquivos formatados, objetivos e bem estruturados.
      </p>

      {msg && <div className="mb-4 p-2 bg-green-100 text-green-700 rounded">{msg}</div>}
      {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={handleFileChange} className="border rounded px-2 py-1 w-full" />
        <input type="text" placeholder="Título do Documento" className="border rounded px-2 py-1 w-full" value={title} onChange={e => setTitle(e.target.value)} required />
        <input type="text" placeholder="Descrição (opcional)" className="border rounded px-2 py-1 w-full" value={description} onChange={e => setDescription(e.target.value)} />
        <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-purple-700 transition w-full font-bold" disabled={uploading}>
          {uploading ? "Enviando..." : "Enviar"}
        </button>
      </form>

      <div className="mt-8">
        <h4 className="text-lg font-semibold mb-2">Documentos já cadastrados</h4>
        <div className="overflow-x-auto rounded-lg shadow">
          <table className="w-full text-sm bg-gray-50">
            <thead>
              <tr>
                <th className="p-2 text-left">Título</th>
                <th className="p-2 text-left">Descrição</th>
                <th className="p-2 text-left">Data de Envio</th>
                <th className="p-2 text-left">Arquivo</th>
                <th className="p-2 text-left">Excluir</th>
              </tr>
            </thead>
            <tbody>
              {docsToShow.map(doc => (
                <tr key={doc.id}>
                  <td className="p-2">{doc.title}</td>
                  <td className="p-2">{doc.description}</td>
                  <td className="p-2">{doc.created_at ? new Date(doc.created_at).toLocaleDateString("pt-BR") : "-"}</td>
                  <td className="p-2">{doc.file_name || "-"}</td>
                  <td className="p-2 text-center">
                    <button className="text-red-500 hover:text-red-700" title="Excluir" onClick={() => handleDelete(doc.id)}>
                      <FaTimes />
                    </button>
                  </td>
                </tr>
              ))}
              {docsToShow.length === 0 && (
                <tr><td className="text-center text-gray-500 py-4" colSpan={5}>Nenhum documento cadastrado ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
