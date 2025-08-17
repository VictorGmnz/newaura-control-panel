import React, { useEffect, useState, useRef } from "react";
import { authFetch } from "../utils/authFetch";
import { FaTimes } from "react-icons/fa";
import { useAuth } from "../utils/authData";

const API_URL = import.meta.env.VITE_API_URL;

export default function UploadEmployeeDocuments() {
  const { user } = useAuth();

  const [docs, setDocs] = useState([]);
  const [docsByFile, setDocsByFile] = useState([]);
  const [roles, setRoles] = useState([]);
  const [expandedDocs, setExpandedDocs] = useState({});
  const toggleDocRoles = (id) =>
    setExpandedDocs(prev => ({ ...prev, [id]: !prev[id] }));

  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const [roleSearch, setRoleSearch] = useState("");

  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [rolesByDoc, setRolesByDoc] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchDocs();
    fetchCompanyRoles();
  }, []);

  useEffect(() => {
    const grouped = groupByFileName(docs);
    setDocsByFile(grouped);
    grouped.forEach((row) => {
      if (!rolesByDoc[row.representativeId]) {
        fetchDocRoles(row.representativeId);
      }
    });
  }, [docs]);

  function groupByFileName(list) {
    const map = new Map();
    for (const d of list) {
      if (!d.file_name) continue;
      const k = d.file_name;
      if (!map.has(k)) {
        map.set(k, []);
      }
      map.get(k).push(d);
    }

    const rows = [];
    for (const [fileName, arr] of map.entries()) {
      arr.sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (db !== da) return db - da;
        return (b.id || 0) - (a.id || 0);
      });
      const rep = arr[0];
      rows.push({
        representativeId: rep.id,
        title: rep.title,
        description: rep.description,
        created_at: rep.created_at,
        file_name: fileName,
      });
    }
    rows.sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });
    return rows;
  }

  async function fetchDocs() {
    setError("");
    try {
      const res = await authFetch(
        `${API_URL}/company/documents?company_id=${user.company_id}&is_employee_doc=true`
      );
      const data = await res.json();
      setDocs(data.documents || []);
    } catch {
      setError("Erro ao listar documentos.");
      setDocs([]);
    }
  }

  async function fetchCompanyRoles() {
    try {
      const res = await authFetch(`${API_URL}/company/roles?company_id=${user.company_id}`);
      const data = await res.json();
      setRoles(data.roles || []);
    } catch {
      setRoles([]);
    }
  }

  async function fetchDocRoles(representativeId) {
    setRolesByDoc((prev) => ({ ...prev, [representativeId]: { loading: true, roles: [] } }));
    try {
      const res = await authFetch(
        `${API_URL}/company/documents/${representativeId}/roles?company_id=${user.company_id}`
      );
      const data = await res.json();
      const docRoles = (data.roles || []).map((r) => ({
        role_id: r.role_id,
        role: r.role,
        access_level: r.access_level,
      }));
      setRolesByDoc((prev) => ({ ...prev, [representativeId]: { loading: false, roles: docRoles } }));
    } catch {
      setRolesByDoc((prev) => ({ ...prev, [representativeId]: { loading: false, roles: null } }));
    }
  }

  function handleFileChange(e) {
    setFile(e.target.files?.[0] || null);
  }

  function handleDelete(representativeId) {
    if (!window.confirm("Confirma exclusão do documento?")) return;
    setError(""); setMsg("");
    authFetch(
      `${API_URL}/company/documents/${representativeId}?company_id=${user.company_id}&is_employee_doc=true`,
      { method: "DELETE" }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.detail) throw new Error(data.detail);
        setMsg(data.message || "Documento excluído!");
        setRolesByDoc((prev) => {
          const copy = { ...prev };
          delete copy[representativeId];
          return copy;
        });
        fetchDocs();
      })
      .catch(() => setError("Erro ao excluir documento."));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setUploading(true);
    setMsg("");
    setError("");

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
      formData.append("created_by", user?.id || 1);
      formData.append("is_employee_doc", "true");
      formData.append("file", file);
      formData.append("role_ids_json", JSON.stringify(selectedRoleIds.map(Number)));

      const uploadRes = await authFetch(`${API_URL}/company/documents/upload`, {
        method: "POST",
        body: formData,
      });
      const uploadJson = await uploadRes.json();

      if (uploadJson.detail) throw new Error(uploadJson.detail);

      setMsg(
        selectedRoleIds.length > 0
          ? "Documento enviado e cargos vinculados com sucesso!"
          : "Documento enviado (acesso para todos os colaboradores)."
      );

      // reset
      setFile(null);
      setTitle("");
      setDescription("");
      setSelectedRoleIds([]);
      setRoleSearch("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setRolesByDoc({});
      fetchDocs();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Erro no envio do documento.");
    } finally {
      setUploading(false);
    }
  }

  // ====== UX de seleção de cargos ======
  const filteredRoles = roles.filter((r) => {
    const q = roleSearch.trim().toLowerCase();
    if (!q) return true;
    const text = `${r.role} ${typeof r.access_level === "number" ? r.access_level : ""}`.toLowerCase();
    return text.includes(q);
  });

  function toggleRole(id) {
    setSelectedRoleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }
  function selectAllFiltered() {
    const ids = filteredRoles.map((r) => r.id);
    setSelectedRoleIds((prev) => Array.from(new Set([...prev, ...ids])));
  }
  function clearSelection() {
    setSelectedRoleIds([]);
  }

  // ====== Helpers de UI ======
  function renderDocRolesCell(representativeId) {
    const entry = rolesByDoc[representativeId];

    if (!entry) {
      return (
        <div className="inline-flex items-center gap-2 text-gray-400">
          <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
          <span>Carregando…</span>
        </div>
      );
    }
    if (entry.roles === null) return <span className="text-red-500">Erro ao carregar cargos</span>;
    if (entry.loading) {
      return (
        <div className="inline-flex items-center gap-2 text-gray-400">
          <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
          <span>Carregando…</span>
        </div>
      );
    }

    const arr = entry.roles || [];
    if (arr.length === 0) return <span className="text-gray-500">Todos</span>;

    const isExpanded = !!expandedDocs[representativeId];
    const maxVisible = 4;

    const visible = isExpanded ? arr : arr.slice(0, maxVisible);
    const hidden = isExpanded ? [] : arr.slice(maxVisible);
    const hiddenCount = hidden.length;

    // lista completa para tooltip (mesmo quando não expandido)
    const fullListTitle = arr.map(r => r.role).join(", ");

    return (
      <div
        className="flex flex-wrap gap-1 max-w-[250px] whitespace-normal break-words"
        title={fullListTitle}
      >
        {visible.map((r) => (
          <span
            key={r.role_id}
            className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs"
            title={typeof r.access_level === "number" ? `Nível ${r.access_level}` : ""}
          >
            {r.role}
          </span>
        ))}

        {!isExpanded && hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => toggleDocRoles(representativeId)}
            className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs hover:bg-gray-200"
            title={hidden.map(r => r.role).join(", ")}
          >
            +{hiddenCount} ver todos
          </button>
        )}

        {isExpanded && arr.length > maxVisible && (
          <button
            type="button"
            onClick={() => toggleDocRoles(representativeId)}
            className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs hover:bg-gray-200"
          >
            ver menos
          </button>
        )}
      </div>
    );
  }


  return (
    <div className="bg-white rounded-xl shadow p-6 mt-12 max-w-6xl mx-auto">
      <h3 className="text-xl font-bold text-primary mb-2">📄 Documentos dos Colaboradores</h3>
      <p className="text-gray-500 mb-4">
        Os documentos inseridos aqui serão utilizados exclusivamente para o Chatbot responder mensagens dos seus colaboradores (ex.: manuais, políticas, práticas internas etc.).
      </p>
      <p className="text-yellow-600 mb-4">
        Envie arquivos PDF, DOCX ou XLSX (máx. 10MB). Para maior precisão, prefira arquivos objetivos e bem estruturados.
      </p>

      {msg && <div className="mb-4 p-2 bg-green-100 text-green-700 rounded">{msg}</div>}
      {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

        {/* Campo de Cargos com UX melhorada */}
        <div className="border rounded-lg p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <label className="text-sm font-medium">Cargos permitidos (opcional)</label>
            <span className="text-xs text-gray-500">Selecionados: {selectedRoleIds.length}</span>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              placeholder="Buscar cargo ou nível…"
              className="border rounded px-2 py-1 w-full"
              value={roleSearch}
              onChange={(e) => setRoleSearch(e.target.value)}
            />
            <button type="button" onClick={selectAllFiltered} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded">
              Selecionar todos
            </button>
            <button type="button" onClick={clearSelection} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded">
              Limpar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-40 overflow-auto pr-1">
            {filteredRoles.map((r) => {
              const checked = selectedRoleIds.includes(r.id);
              return (
                <label
                  key={r.id}
                  className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${
                    checked ? "bg-purple-50" : "hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="accent-purple-600"
                    checked={checked}
                    onChange={() => toggleRole(r.id)}
                  />
                  <span className="text-sm">
                    {r.role}
                    {typeof r.access_level === "number" ? (
                      <span className="text-gray-500"> · Nível {r.access_level}</span>
                    ) : null}
                  </span>
                </label>
              );
            })}
            {filteredRoles.length === 0 && (
              <div className="text-xs text-gray-500">Nenhum cargo encontrado.</div>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-2">
            Se nenhum cargo for selecionado, o documento ficará acessível a <strong>todos</strong> os colaboradores.
          </p>
        </div>

        <button
          type="submit"
          className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-purple-700 transition w-full font-bold"
          disabled={uploading}
        >
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
                <th className="p-2 text-left">Cargos</th>
                <th className="p-2 text-left">Excluir</th>
              </tr>
            </thead>
            <tbody>
              {docsByFile.map((row) => (
                <tr key={row.representativeId}>
                  <td className="p-2">{row.title}</td>
                  <td className="p-2">{row.description}</td>
                  <td className="p-2">
                    {row.created_at
                      ? new Date(row.created_at).toLocaleDateString("pt-BR")
                      : "-"}
                  </td>
                  <td className="p-2">{row.file_name || "-"}</td>
                  <td className="p-2">{renderDocRolesCell(row.representativeId)}</td>
                  <td className="p-2 text-center">
                    <button
                      className="text-red-500 hover:text-red-700"
                      title="Excluir"
                      onClick={() => handleDelete(row.representativeId)}
                    >
                      <FaTimes />
                    </button>
                  </td>
                </tr>
              ))}
              {docsByFile.length === 0 && (
                <tr>
                  <td className="text-center text-gray-500 py-4" colSpan={6}>
                    Nenhum documento cadastrado ainda.
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
