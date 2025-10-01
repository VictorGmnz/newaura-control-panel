import React, { useEffect, useState, useRef, useMemo } from "react";
import { authFetch } from "../utils/authFetch";
import { FaTimes } from "react-icons/fa";
import { useAuth } from "../utils/authData";

const API_URL = import.meta.env.VITE_API_URL;

function Arrow({ active, dir }) {
  const cls = active ? "opacity-100" : "opacity-30";
  return <span className={`ml-1 text-xs ${cls}`}>{dir === "asc" ? "▲" : "▼"}</span>;
}

function toTimestamp(dateStr) {
  if (!dateStr) return 0;
  if (dateStr.includes("-")) {
    const t = Date.parse(dateStr);
    return Number.isNaN(t) ? 0 : t;
  }
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateStr.trim());
  if (m) {
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const y = parseInt(m[3], 10);
    const dt = new Date(y, mo, d).getTime();
    return Number.isNaN(dt) ? 0 : dt;
  }
  const t = Date.parse(dateStr);
  return Number.isNaN(t) ? 0 : t;
}

export default function UploadDocuments() {
  const { user } = useAuth();

  const [docs, setDocs] = useState([]);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const [searchTitle, setSearchTitle] = useState("");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  const fileInputRef = useRef(null);

  const docsMap = {};
  docs.forEach((doc) => {
    const key = `${doc.title}-${doc.file_name}`;
    if (!docsMap[key]) docsMap[key] = doc;
  });
  const docsToShow = Object.values(docsMap);

  const docsFiltered = useMemo(() => {
    const q = searchTitle.trim().toLowerCase();
    if (!q) return docsToShow;
    return docsToShow.filter(d => (d.title || "").toLowerCase().includes(q));
  }, [searchTitle, docsToShow]);

  const docsView = useMemo(() => {
    const arr = docsFiltered.slice();
    arr.sort((a, b) => {
      if (sortKey === "created_at") {
        const ta = toTimestamp(a.created_at);
        const tb = toTimestamp(b.created_at);
        return sortDir === "asc" ? ta - tb : tb - ta;
      }
      const va = (a[sortKey] || "").toString().toLowerCase();
      const vb = (b[sortKey] || "").toString().toLowerCase();
      const cmp = va.localeCompare(vb, undefined, { sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [docsFiltered, sortKey, sortDir]);

  useEffect(() => {
    fetchDocs();
  }, []);

  function fetchDocs() {
    setError("");
    authFetch(`${API_URL}/company/documents?company_id=${user.company_id}&is_employee_doc=false`)
      .then((res) => res.json())
      .then((data) => setDocs(data.documents || []))
      .catch(() => setError("Erro ao listar documentos."));
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f && f.size > 10 * 1024 * 1024) {
      setError("Tamanho máximo do arquivo é 10MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFile(null);
    }
  }

  function handleDelete(docId) {
    if (!window.confirm("Confirma exclusão do documento?")) return;
    setError(""); setMsg("");
    authFetch(`${API_URL}/company/documents/${docId}?company_id=${user.company_id}&is_employee_doc=false`, { method: "DELETE" })
      .then((res) => res.json())
      .then((data) => {
        if (data.detail) throw new Error(data.detail);
        setMsg(data.message || "Documento excluído!");
        fetchDocs();
      })
      .catch(() => setError("Erro ao excluir documento."));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setUploading(true);
    setMsg(""); setError("");

    if (!file || !title) {
      setError("Título e arquivo são obrigatórios!");
      setUploading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("company_id", user.company_id);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("tags", tags);
      formData.append("created_by", user?.id || 1);
      formData.append("is_employee_doc", "false");
      formData.append("file", file);

      const res = await authFetch(`${API_URL}/company/documents/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.detail) throw new Error(data.detail);

      setMsg(data.message || "Documento enviado com sucesso!");
      setFile(null); setTitle(""); setDescription(""); setTags("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchDocs();
    } catch (err) {
      setError(err?.message || "Erro no envio do documento.");
    } finally {
      setUploading(false);
    }
  }

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "created_at" ? "desc" : "asc");
    }
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 mt-4 max-w-6xl mx-auto">
      <h3 className="text-xl font-bold text-primary mb-2">📄 Documentos para Leads</h3>
      <p className="text-gray-500 mb-4">
        Os documentos inseridos aqui serão utilizados exclusivamente para o Chatbot responder novos contatos(Leads).
        <br />(ex.: cardápios, listas de preços, políticas de troca etc.).
      </p>
      <p className="text-yellow-600 mb-4 font-bold">
        Envie arquivos PDF, DOCX ou XLSX (máx. 10MB). Prefira arquivos objetivos e bem estruturados.
      </p>

      {msg && <div className="mb-4 p-2 bg-green-100 text-green-700 rounded">{msg}</div>}
      {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx"
          onChange={handleFileChange}
          className="border rounded px-2 py-2 w-full"
        />
        <input
          type="text"
          placeholder="Título do Documento"
          className="border rounded px-3 py-2 w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Descrição (opcional)"
          className="border rounded px-3 py-2 w-full"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          type="text"
          placeholder="Tags (opcional, separadas por vírgula | ex.: cardápio, valores, promoções)"
          className="border rounded px-3 py-2 w-full"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />

        <button
          type="submit"
          className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-purple-700 transition w-full font-bold"
          disabled={uploading}
        >
          {uploading ? "Enviando..." : "Enviar"}
        </button>
      </form>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold">Documentos já cadastrados</h4>
          <input
            type="text"
            placeholder="Filtrar por título"
            className="border rounded px-3 py-1 w-64"
            value={searchTitle}
            onChange={e => setSearchTitle(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto rounded-lg shadow">
          <table className="w-full text-sm bg-gray-50">
            <thead>
              <tr>
                <th className="p-2 text-left cursor-pointer select-none" onClick={() => toggleSort("title")}>
                  Título
                  <Arrow active={sortKey === "title"} dir={sortDir} />
                </th>
                <th className="p-2 text-left cursor-pointer select-none" onClick={() => toggleSort("description")}>
                  Descrição
                  <Arrow active={sortKey === "description"} dir={sortDir} />
                </th>
                <th className="p-2 text-left cursor-pointer select-none" onClick={() => toggleSort("created_at")}>
                  Data de Envio
                  <Arrow active={sortKey === "created_at"} dir={sortDir} />
                </th>
                <th className="p-2 text-left cursor-pointer select-none" onClick={() => toggleSort("file_name")}>
                  Arquivo
                  <Arrow active={sortKey === "file_name"} dir={sortDir} />
                </th>
                <th className="p-2 text-center">Excluir</th>
              </tr>
            </thead>
            <tbody>
              {docsView.map((doc) => (
                <tr key={doc.id}>
                  <td className="p-2">{doc.title}</td>
                  <td className="p-2">{doc.description}</td>
                  <td className="p-2">
                    {doc.created_at
                      ? new Date(doc.created_at).toLocaleDateString("pt-BR")
                      : "-"}
                  </td>
                  <td className="p-2">{doc.file_name || "-"}</td>
                  <td className="p-2 text-center">
                    <button
                      className="text-red-500 hover:text-red-700"
                      title="Excluir"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <FaTimes />
                    </button>
                  </td>
                </tr>
              ))}
              {docsView.length === 0 && (
                <tr>
                  <td className="text-center text-gray-500 py-4" colSpan={5}>
                    Nenhum documento {searchTitle ? "para esse filtro." : "cadastrado ainda."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
