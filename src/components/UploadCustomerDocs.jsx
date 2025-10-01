// src/components/UploadCustomerDocs.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { useAuth } from "../utils/authData";
import { api } from "../utils/apiClient";

function normalizeAllowedPages(user) {
  const ap = Array.isArray(user?.allowed_pages) ? user.allowed_pages : [];
  return ap.map(String).map(s => s.trim()).filter(Boolean);
}

function toTimestamp(dateStr) {
  if (!dateStr) return 0;
  if (dateStr.includes("-")) {
    const t = Date.parse(dateStr);
    return Number.isNaN(t) ? 0 : t;
  }
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(dateStr).trim());
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

function dedupeDocuments(list) {
  const map = new Map();
  for (const d of list || []) {
    const key = d.file_name || `${d.title || ""}|${d.created_at || ""}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(d);
  }
  const rows = [];
  for (const [, arr] of map.entries()) {
    arr.sort((a, b) => {
      const ta = toTimestamp(a.created_at);
      const tb = toTimestamp(b.created_at);
      if (tb !== ta) return tb - ta;
      return (b.id || 0) - (a.id || 0);
    });
    rows.push(arr[0]);
  }
  rows.sort((a, b) => {
    const ta = toTimestamp(a.created_at);
    const tb = toTimestamp(b.created_at);
    if (tb !== ta) return tb - ta;
    return (b.id || 0) - (a.id || 0);
  });
  return rows;
}

function Arrow({ active, dir }) {
  const cls = active ? "opacity-100" : "opacity-30";
  return <span className={`ml-1 text-xs ${cls}`}>{dir === "asc" ? "▲" : "▼"}</span>;
}

export default function UploadCustomerDocs({customerId,customerName,onUploaded,}) {
  const { user, token } = useAuth();
  const companyId = user?.company_id;

  const allowed = useMemo(() => normalizeAllowedPages(user), [user]);
  const allPages = useMemo(() => new Set(allowed).has("all_pages"), [allowed]);
  const isAdmin = allPages;

  const withAuth = (cfg = {}) => ({
    ...cfg,
    headers: { ...(cfg.headers || {}), Authorization: `Bearer ${token}` },
  });

  const [docs, setDocs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customersByDoc, setCustomersByDoc] = useState({});
  const [expandedDocs, setExpandedDocs] = useState({});
  const [customerFilterId, setCustomerFilterId] = useState("");
  const [searchTitle, setSearchTitle] = useState("");

  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [applyToAll, setApplyToAll] = useState(false);

  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!companyId || !customerId || !token) return;
    fetchDocs();
    if (isAdmin) fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, customerId, token, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    docs.forEach(d => {
      if (!customersByDoc[d.id]) fetchDocCustomers(d.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs, isAdmin]);

  async function fetchDocs() {
    try {
      setError("");
      const resp = await api.get(`/company/customers/${customerId}/documents`, withAuth({
        params: { company_id: companyId },
      }));
      const rows = Array.isArray(resp?.data?.documents) ? resp.data.documents : [];
      setDocs(dedupeDocuments(rows));
    } catch {
      setDocs([]);
      setError("Erro ao listar documentos do cliente.");
    }
  }

async function fetchCustomers() {
    try {
        const LIMIT = 200;
        let page = 1;
        let all = [];
        while (true) {
        const resp = await api.get(`/company/customers`, withAuth({
            params: { company_id: companyId, page, limit: LIMIT },
        }));
        const data = resp?.data || {};
        const items = data.items || data.customers || [];
        all = all.concat(items);
        const total = Number(data.total ?? all.length);
        if (!items.length || all.length >= total) break;
        page += 1;
        }
        const list = Array.from(
        new Map(
            all.map(c => [c.id, { id: c.id, name: c.trade_name || c.customer || `Cliente ${c.id}` }])
        ).values()
        ).sort((a, b) => a.name.localeCompare(b.name));
        setCustomers(list);
    } catch {
        setCustomers([]);
    }
}

  async function fetchDocCustomers(docId) {
    setCustomersByDoc(prev => ({ ...prev, [docId]: { loading: true, customers: [] } }));
    try {
      const resp = await api.get(`/company/documents/${docId}/customers`, withAuth({
        params: { company_id: companyId },
      }));
      const arr = Array.isArray(resp?.data?.customers) ? resp.data.customers : [];
      const mapped = arr.map(c => ({ customer_id: c.customer_id, name: c.customer }));
      setCustomersByDoc(prev => ({ ...prev, [docId]: { loading: false, customers: mapped } }));
      return mapped;
    } catch {
      setCustomersByDoc(prev => ({ ...prev, [docId]: { loading: false, customers: null } }));
      return null;
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

  function toggleCustomer(id) {
    setSelectedCustomerIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }
  function clearSelection() {
    setSelectedCustomerIds([]);
  }

  const filteredCustomers = useMemo(() => {
    const q = (customerSearch || "").trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(c => c.name.toLowerCase().includes(q));
  }, [customerSearch, customers]);

  async function canDeleteDocAsNonAdmin(docId) {
    let entry = customersByDoc[docId];
    let docCustomers = entry?.customers;
    if (!entry || entry.loading || docCustomers == null) {
      docCustomers = await fetchDocCustomers(docId);
    }
    if (!docCustomers) {
      setError("Não foi possível verificar a permissão para este documento.");
      return false;
    }
    if (docCustomers.length === 0) {
      setError("Você não pode excluir este documento pois ele está disponível para outros clientes além deste.");
      return false;
    }
    const hasOther = docCustomers.some(c => Number(c.customer_id) !== Number(customerId));
    if (hasOther) {
      setError("Você não pode excluir este documento pois ele está vinculado a outros clientes além deste.");
      return false;
    }
    return true;
  }

  async function handleDelete(docId) {
    if (!window.confirm("Confirma exclusão do documento?")) return;
    setError(""); setMsg("");

    if (!isAdmin) {
      const ok = await canDeleteDocAsNonAdmin(docId);
      if (!ok) return;
    }

    try {
      const resp = await api.delete(`/company/documents/${docId}`, withAuth({
        params: { company_id: companyId, is_client_doc: true },
      }));
      setMsg(resp?.data?.message || "Documento excluído!");
      setCustomersByDoc(prev => {
        const copy = { ...prev };
        delete copy[docId];
        return copy;
      });
      fetchDocs();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(detail || "Erro ao excluir documento.");
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

      let customerIdsToSend = [];
      if (!applyToAll) {
        if (isAdmin) {
          customerIdsToSend = selectedCustomerIds.length > 0
            ? selectedCustomerIds.slice()
            : [Number(customerId)];
        } else {
          customerIdsToSend = [Number(customerId)];
        }
      }

      const formData = new FormData();
      formData.append("company_id", companyId);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("created_by", user?.id || 1);
      formData.append("is_client_doc", "true");
      formData.append("file", file);
      formData.append("customer_ids_json", JSON.stringify(customerIdsToSend.map(Number)));

      const resp = await api.post(`/company/documents/upload`, formData, withAuth());
      const data = resp?.data || {};
      setMsg(
        applyToAll
          ? "Documento enviado para todos os clientes!"
          : (customerIdsToSend.length > 1
            ? "Documento enviado e vinculado aos clientes selecionados!"
            : "Documento enviado com sucesso!")
      );

      setFile(null);
      setTitle("");
      setDescription("");
      setApplyToAll(false);
      setSelectedCustomerIds([]);
      setCustomerSearch("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      setCustomersByDoc({});
      await fetchDocs();
      if (typeof onUploaded === "function") onUploaded(data);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(detail || "Erro no envio do documento.");
    } finally {
      setUploading(false);
    }
  }

  const docsFiltered = useMemo(() => {
    let arr = docs;
    const q = searchTitle.trim().toLowerCase();
    if (q) {
      arr = arr.filter(d => (d.title || "").toLowerCase().includes(q));
    }
    if (isAdmin && customerFilterId) {
      const cId = Number(customerFilterId);
      arr = arr.filter(d => {
        const entry = customersByDoc[d.id];
        if (!entry || entry.loading) return false;
        if (entry.customers === null) return false;
        const rs = entry.customers || [];
        if (rs.length === 0) return false;
        return rs.some(r => Number(r.customer_id) === cId);
      });
    }
    return arr;
  }, [docs, searchTitle, isAdmin, customerFilterId, customersByDoc]);

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

  function toggleDocCustomers(id) {
    setExpandedDocs(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function renderDocCustomersCell(docId) {
    const entry = customersByDoc[docId];
    if (!entry) {
      return (
        <div className="inline-flex items-center gap-2 text-gray-400">
          <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
          <span>Carregando…</span>
        </div>
      );
    }
    if (entry.customers === null) return <span className="text-red-500">Erro</span>;
    if (entry.loading) {
      return (
        <div className="inline-flex items-center gap-2 text-gray-400">
          <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
          <span>Carregando…</span>
        </div>
      );
    }
    const arr = entry.customers || [];
    if (arr.length === 0) return <span className="text-gray-600">Todos</span>;
    const isExpanded = !!expandedDocs[docId];
    const maxVisible = 4;
    const visible = isExpanded ? arr : arr.slice(0, maxVisible);
    const hidden = isExpanded ? [] : arr.slice(maxVisible);
    const hiddenCount = hidden.length;
    const fullListTitle = arr.map(r => r.name).join(", ");
    return (
      <div className="flex flex-wrap gap-1 max-w-[260px] whitespace-normal break-words" title={fullListTitle}>
        {visible.map((r) => (
          <span key={r.customer_id} className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">
            {r.name}
          </span>
        ))}
        {!isExpanded && hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => toggleDocCustomers(docId)}
            className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs hover:bg-gray-200"
            title={hidden.map(r => r.name).join(", ")}
          >
            +{hiddenCount} ver todos
          </button>
        )}
        {isExpanded && arr.length > maxVisible && (
          <button
            type="button"
            onClick={() => toggleDocCustomers(docId)}
            className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs hover:bg-gray-200"
          >
            ver menos
          </button>
        )}
      </div>
    );
  }

  const totalCols = isAdmin ? 6 : 5;

  return (
    <div className="bg-white rounded-xl shadow p-6 max-w-6xl mx-auto">
      <h3 className="text-xl font-bold text-primary mb-2">
        📄 Documentos — {customerName || `Cliente #${customerId}`}
      </h3>
      <p className="text-gray-500 mb-4">
        Os documentos inseridos aqui serão utilizados pelo Chatbot para responder o cliente <strong>{customerName || ""}</strong>.
      </p>
      <p className="text-yellow-600 mb-4 font-bold">
        Envie arquivos PDF, DOCX ou XLSX (máx. 10MB).
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

        {isAdmin && (
          <div className={`border bg-gray-100 rounded-lg p-3 ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
            <h3 className="text-xl font-bold text-primary">Área do Administrador</h3><br />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="accent-blue-700"
                checked={applyToAll}
                onChange={e => setApplyToAll(e.target.checked)}
                disabled={uploading}
              />
              <span className="font-medium">Disponibilizar documento para todos os clientes</span>
            </label>
            <div className="h-px bg-gray-500 mt-4" />
            {!applyToAll && (
              <>
                <div className="flex items-center justify-between gap-2 mt-3">
                  <label className="text-sm font-medium">
                    Disponibilizar para clientes específicos (opcional)
                    {isAdmin && <> — se nenhum cliente for selecionado, o documento será vinculado ao cliente atual (<strong>{customerName || ""}</strong>).</>}
                  </label>
                  <span className="text-xs text-gray-500">Selecionados: {selectedCustomerIds.length}</span>
                </div>

                <div className="flex items-center gap-2 mb-3 mt-2">
                  <input
                    type="text"
                    placeholder="Buscar cliente…"
                    className="border rounded px-2 py-1 w-full"
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    disabled={uploading}
                  />
                </div>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-xs font-bold text-primary hover:bg-gray-200 mb-4 mt-2 px-2 py-1 rounded"
                  disabled={uploading}
                >
                  Limpar clientes selecionados
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1 max-h-48 overflow-auto pr-1">
                  {filteredCustomers.map(c => {
                    const checked = selectedCustomerIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${checked ? "bg-blue-100" : "hover:bg-gray-50"}`}
                      >
                        <input
                          type="checkbox"
                          className="accent-blue-600"
                          checked={checked}
                          onChange={() => toggleCustomer(c.id)}
                          disabled={uploading}
                        />
                        <span className="text-sm">{c.name}</span>
                      </label>
                    );
                  })}
                  {filteredCustomers.length === 0 && (
                    <div className="text-xs text-gray-500">Nenhum cliente encontrado.</div>
                  )}
                </div>
              </>
            )}

            {applyToAll && (
              <p className="text-xs text-gray-600 mt-2">
                Com esta opção marcada, o documento ficará acessível para <strong>todos</strong> os clientes.
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

      <div className="mt-8">
        <div className="flex items-center justify-between mb-2 gap-2">
          <h4 className="text-lg font-semibold">Listagem de Documentos</h4>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <select
                className="border rounded px-3 py-1"
                value={customerFilterId}
                onChange={e => setCustomerFilterId(e.target.value)}
                title="Filtrar por cliente"
              >
                <option value="">Todos os clientes</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
            <input
              type="text"
              placeholder="Filtrar por título"
              className="border rounded px-3 py-1 w-64"
              value={searchTitle}
              onChange={e => setSearchTitle(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg shadow mt-6">
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
                {isAdmin && <th className="p-2 text-left">Clientes</th>}
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
                  {isAdmin && <td className="p-2">{renderDocCustomersCell(doc.id)}</td>}
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
