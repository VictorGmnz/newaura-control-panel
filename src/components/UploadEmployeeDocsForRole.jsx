import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { authFetch } from "../utils/authFetch";
import { useAuth } from "../utils/authData";
import { FaTimes } from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL;

function normalizeAllowedPages(user) {
  const ap = Array.isArray(user?.allowed_pages) ? user.allowed_pages : [];
  return ap.map(String).map(s => s.trim()).filter(Boolean);
}

function Arrow({ active, dir }) {
  const cls = active ? "opacity-100" : "opacity-30";
  return (
    <span className={`ml-1 text-xs ${cls}`}>
      {dir === "asc" ? "▲" : "▼"}
    </span>
  );
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

export default function UploadEmployeeDocsForRole() {
  const { user } = useAuth();
  const { roleId } = useParams();
  const numericRoleId = Number(roleId);

  const allowed = useMemo(() => normalizeAllowedPages(user), [user]);
  const allPages = useMemo(() => new Set(allowed).has("all_pages"), [allowed]);

  const [docs, setDocs] = useState([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  const [applyToAll, setApplyToAll] = useState(false);

  const [roles, setRoles] = useState([]);
  const [roleSearch, setRoleSearch] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const fileInputRef = useRef(null);

  const [searchTitle, setSearchTitle] = useState("");

  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  const [rolesByDoc, setRolesByDoc] = useState({});
  const [expandedDocs, setExpandedDocs] = useState({});
  const toggleDocRoles = (id) => setExpandedDocs(prev => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => {
    fetchDocs();
  }, [roleId]);

  useEffect(() => {
    if (!allPages) return;
    fetchCompanyRoles();
  }, [allPages]);

  useEffect(() => {
    if (!allPages) return;
    docs.forEach(d => {
      if (!rolesByDoc[d.id]) fetchDocRoles(d.id);
    });
  }, [docs, allPages]);

  async function fetchDocs() {
    try {
      setError("");
      const res = await authFetch(
        `${API_URL}/company/roles/${numericRoleId}/documents?company_id=${user.company_id}&is_employee_doc=true`
      );
      const data = await res.json();
      setDocs(Array.isArray(data?.documents) ? data.documents : []);
    } catch {
      setDocs([]);
      setError("Erro ao listar documentos do setor.");
    }
  }

  async function fetchCompanyRoles() {
    try {
      const res = await authFetch(`${API_URL}/company/roles?company_id=${user.company_id}`);
      const data = await res.json();
      const list = (data.roles || []).slice().sort((a, b) => {
        const la = Number.isFinite(a.access_level) ? a.access_level : 999999;
        const lb = Number.isFinite(b.access_level) ? b.access_level : 999999;
        if (la !== lb) return la - lb;
        return (a.role || "").localeCompare(b.role || "");
      });
      setRoles(list);
    } catch {
      setRoles([]);
    }
  }

  async function fetchDocRoles(docId) {
    setRolesByDoc(prev => ({ ...prev, [docId]: { loading: true, roles: [] } }));
    try {
      const res = await authFetch(
        `${API_URL}/company/documents/${docId}/roles?company_id=${user.company_id}`
      );
      const data = await res.json();
      const docRoles = (data.roles || []).map(r => ({
        role_id: r.role_id,
        role: r.role,
        access_level: r.access_level,
      }));
      setRolesByDoc(prev => ({ ...prev, [docId]: { loading: false, roles: docRoles } }));
    } catch {
      setRolesByDoc(prev => ({ ...prev, [docId]: { loading: false, roles: null } }));
    }
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

  function toggleRole(id) {
    setSelectedRoleIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function selectAllFiltered() {
    const ids = filteredRoles.map(r => r.id);
    setSelectedRoleIds(prev => Array.from(new Set([...prev, ...ids])));
  }
  function clearSelection() {
    setSelectedRoleIds([]);
  }

  const filteredRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(r => {
      const txt = `${r.role} ${Number.isFinite(r.access_level) ? r.access_level : ""}`.toLowerCase();
      return txt.includes(q);
    });
  }, [roleSearch, roles]);

  async function handleDelete(docId) {
    if (!window.confirm("Confirma exclusão do documento?")) return;
    setError(""); setMsg("");
    try {
      const res = await authFetch(
        `${API_URL}/company/documents/${docId}?company_id=${user.company_id}&is_employee_doc=true`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Erro ao excluir documento.");
      setMsg(data.message || "Documento excluído!");
      setRolesByDoc(prev => {
        const copy = { ...prev };
        delete copy[docId];
        return copy;
      });
      fetchDocs();
    } catch (err) {
      setError(err.message || "Erro ao excluir documento.");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(""); setError("");

    if (!file || !title) {
      setError("Título e arquivo são obrigatórios!");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Arquivo excede 10 MB!");
      return;
    }

    try {
      setUploading(true);

      let roleIdsToSend = [];
      if (!applyToAll) {
        if (allPages) {
          roleIdsToSend = selectedRoleIds.length > 0 ? selectedRoleIds.slice() : [numericRoleId];
        } else {
          roleIdsToSend = [numericRoleId];
        }
      }
      const formData = new FormData();
      formData.append("company_id", user.company_id);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("created_by", user?.id || 1);
      formData.append("is_employee_doc", "true");
      formData.append("file", file);
      formData.append("role_ids_json", JSON.stringify(roleIdsToSend.map(Number)));

      const res = await authFetch(`${API_URL}/company/documents/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Erro no envio do documento.");

      setMsg(
        applyToAll
          ? "Documento enviado para todos os cargos!"
          : roleIdsToSend.length > 1
          ? "Documento enviado e vinculado aos cargos selecionados!"
          : "Documento enviado com sucesso!"
      );

      setFile(null);
      setTitle("");
      setDescription("");
      setApplyToAll(false);
      setSelectedRoleIds([]);
      setRoleSearch("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      setRolesByDoc({});
      fetchDocs();
    } catch (err) {
      setError(err?.message || "Erro no envio do documento.");
    } finally {
      setUploading(false);
    }
  }

  const docsFiltered = useMemo(() => {
    const q = searchTitle.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter(d => (d.title || "").toLowerCase().includes(q));
  }, [searchTitle, docs]);

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

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "created_at" ? "desc" : "asc");
    }
  }

  function renderDocRolesCell(docId) {
    const entry = rolesByDoc[docId];
    if (!entry) {
      return (
        <div className="inline-flex items-center gap-2 text-gray-400">
          <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
          <span>Carregando…</span>
        </div>
      );
    }
    if (entry.roles === null) return <span className="text-red-500">Erro</span>;
    if (entry.loading) {
      return (
        <div className="inline-flex items-center gap-2 text-gray-400">
          <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
          <span>Carregando…</span>
        </div>
      );
    }

    const arr = entry.roles || [];
    if (arr.length === 0) return <span className="text-gray-600">Todos</span>;

    const isExpanded = !!expandedDocs[docId];
    const maxVisible = 4;
    const visible = isExpanded ? arr : arr.slice(0, maxVisible);
    const hidden = isExpanded ? [] : arr.slice(maxVisible);
    const hiddenCount = hidden.length;
    const fullListTitle = arr.map(r => r.role).join(", ");

    return (
      <div
        className="flex flex-wrap gap-1 max-w-[260px] whitespace-normal break-words"
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
            onClick={() => toggleDocRoles(docId)}
            className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs hover:bg-gray-200"
            title={hidden.map(r => r.role).join(", ")}
          >
            +{hiddenCount} ver todos
          </button>
        )}

        {isExpanded && arr.length > maxVisible && (
          <button
            type="button"
            onClick={() => toggleDocRoles(docId)}
            className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs hover:bg-gray-200"
          >
            ver menos
          </button>
        )}
      </div>
    );
  }

  const totalCols = allPages ? 6 : 5;

  return (
    <div className="bg-white rounded-xl shadow p-6 mt-12 max-w-6xl mx-auto">
      <h3 className="text-xl font-bold text-primary mb-2">📄 Documentos do Setor</h3>
      <p className="text-gray-500 mb-4">
        Os documentos inseridos aqui serão utilizados exclusivamente para o Chatbot responder seus colaboradores (ex.: agendas, instruções de trabalhos, manuais, etc.).
      </p>
      <p className="text-yellow-600 mb-4">
        Envie arquivos PDF, DOCX ou XLSX (máx. 10MB). Prefira arquivos objetivos e bem estruturados.
      </p>

      {msg && <div className="mb-4 p-2 bg-green-100 text-green-700 rounded">{msg}</div>}
      {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>}

      {/* Upload */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx"
          onChange={handleFileChange}
          className="border rounded px-2 py-2 w-full"
          disabled={uploading}
        />

        <input
          type="text"
          maxLength={200}
          placeholder="Título do Documento"
          className="border rounded px-3 py-2 w-full"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          disabled={uploading}
        />

        <input
          type="text"
          maxLength={500}
          placeholder="Descrição (opcional)"
          className="border rounded px-3 py-2 w-full"
          value={description}
          onChange={e => setDescription(e.target.value)}
          disabled={uploading}
        />

        {/* Admin: disponibilizar para todos */}
        {allPages && (
          <div className={`border bg-gray-100 rounded-lg p-3 ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
            <h3 className="text-xl font-bold text-primary">Opção Exclusiva para Administradores</h3><br />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="accent-purple-700"
                checked={applyToAll}
                onChange={e => setApplyToAll(e.target.checked)}
                disabled={uploading}
              />
              <span className="font-medium">Disponibilizar documento para todos os cargos</span>
            </label>

            {!applyToAll && (
              <>
                <div className="flex items-center justify-between gap-2 mt-3">
                  <label className="text-sm font-medium">
                    Setores específicos (opcional) — se nenhum setor for selecionado, o documento será vinculado ao setor atual.
                  </label>
                  <span className="text-xs text-gray-500">Selecionados: {selectedRoleIds.length}</span>
                </div>

                <div className="flex items-center gap-2 mb-3 mt-2">
                  <input
                    type="text"
                    placeholder="Buscar cargo ou nível…"
                    className="border rounded px-2 py-1 w-full"
                    value={roleSearch}
                    onChange={e => setRoleSearch(e.target.value)}
                    disabled={uploading}
                  />
                  <button type="button" onClick={clearSelection} className="text-xs font-bold text-primary hover:bg-gray-200 px-2 py-1 rounded" disabled={uploading}>
                    Limpar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1 max-h-48 overflow-auto pr-1">
                  {filteredRoles.map(r => {
                    const checked = selectedRoleIds.includes(r.id);
                    return (
                      <label
                        key={r.id}
                        className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${checked ? "bg-purple-100" : "hover:bg-gray-50"}`}
                      >
                        <input
                          type="checkbox"
                          className="accent-purple-600"
                          checked={checked}
                          onChange={() => toggleRole(r.id)}
                          disabled={uploading}
                        />
                        <span className="text-sm">
                          {r.role}
                          {Number.isFinite(r.access_level) && (
                            <span className="text-gray-500"> · Nível {r.access_level}</span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                  {filteredRoles.length === 0 && (
                    <div className="text-xs text-gray-500">Nenhum cargo encontrado.</div>
                  )}
                </div>
              </>
            )}

            {applyToAll && (
              <p className="text-xs text-gray-600 mt-2">
                Com esta opção marcada, o documento ficará acessível para <strong>todos</strong> os setores.
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-purple-700 transition w-full font-bold disabled:opacity-70"
          disabled={uploading}
        >
          {uploading ? "Enviando..." : "Enviar"}
        </button>
      </form>

      {/* Busca + listagem */}
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
                {allPages && <th className="p-2 text-left">Setores</th>}
                <th className="p-2 text-left">Excluir</th>
              </tr>
            </thead>
            <tbody>
              {docsView.map(doc => (
                <tr key={doc.id}>
                  <td className="p-2">{doc.title}</td>
                  <td className="p-2">{doc.description}</td>
                  <td className="p-2">{doc.created_at || "-"}</td>
                  <td className="p-2">{doc.file_name || "-"}</td>
                  {allPages && (
                    <td className="p-2">
                      {renderDocRolesCell(doc.id)}
                    </td>
                  )}
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
                  <td className="text-center text-gray-500 py-4" colSpan={totalCols}>
                    Nenhum documento encontrado {searchTitle ? "para esse filtro." : "ainda."}
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
