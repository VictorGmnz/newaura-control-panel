import React, { useEffect, useMemo, useState } from "react";
import { authFetch } from "../utils/authFetch";
import { useAuth } from "../utils/authData";
import { FaEye, FaEyeSlash, FaSort, FaSortUp, FaSortDown } from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL;

const PERMISSION_OPTIONS = [
  { key: "dashboard", label: "Página de Dashboards" },
  { key: "messages", label: "Página de Conversas" },
  { key: "feedback", label: "Página de Feedbacks" },
  { key: "reports", label: "Página de Relatórios" },
  { key: "config_company", label: "Configuração da Empresa" },
  { key: "config_documents", label: "Configuração de Documentos" },
  { key: "config_chatbot", label: "Configuração do Chatbot" },
  { key: "config_admin", label: "Configuração de Administração" },
  { key: "config_root", label: "Todas as Configurações" },
];

const EMPTY_PERMS = Object.fromEntries(PERMISSION_OPTIONS.map(o => [o.key, false]));
const ALL_CONFIGS = PERMISSION_OPTIONS.map(opt => opt.key);

export default function ConfigAdministrationPage() {
  const { user } = useAuth();

  const [colabs, setColabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    username: "",
    password: "",
    role_id: "",
    phone: "",
    cpf: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [roleMsg, setRoleMsg] = useState("");
  const [roleErr, setRoleErr] = useState("");
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleEditing, setRoleEditing] = useState(null);
  const [roleForm, setRoleForm] = useState({ role: "", level_id: "" });

  const [levels, setLevels] = useState([]);
  const [levelsLoading, setLevelsLoading] = useState(false);
  const [levelMsg, setLevelMsg] = useState("");
  const [levelErr, setLevelErr] = useState("");

  const [permModalOpen, setPermModalOpen] = useState(false);
  const [permModalErr, setPermModalErr] = useState("");
  const [permModalLevelInput, setPermModalLevelInput] = useState("");
  const [permModalPerms, setPermModalPerms] = useState(EMPTY_PERMS);
  const [editingLevel, setEditingLevel] = useState(null);

  // --- ORDENACAO ---
  const [colabSort, setColabSort] = useState({ key: "nome", dir: "asc" });
  const [roleSort, setRoleSort]   = useState({ key: "access_level", dir: "asc" });

  const toggleColabSort = (key) =>
    setColabSort(s => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const toggleRoleSort = (key) =>
    setRoleSort(s => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const sortIcon = (state, key) => {
    if (state.key !== key) return <FaSort className="inline-block ml-1 opacity-60" />;
    return state.dir === "asc" ? <FaSortUp className="inline-block ml-1" /> : <FaSortDown className="inline-block ml-1" />;
  };

  // --- FILTROS ---
  const [roleFilter, setRoleFilter]   = useState("");
  const [levelFilter, setLevelFilter] = useState("");

  const [colabFilterName, setColabFilterName] = useState("");
  const [colabFilterEmail, setColabFilterEmail] = useState("");
  const [colabFilterRole, setColabFilterRole] = useState("");

  useEffect(() => {
    fetchColabs();
    fetchRoles();
    fetchLevels();
  }, []);

  const rolesById = useMemo(() => {
    const m = {};
    roles.forEach(r => (m[r.id] = r));
    return m;
  }, [roles]);

  const levelsSorted = useMemo(
    () => [...levels].sort((a, b) => (a.access_level ?? 1e9) - (b.access_level ?? 1e9)),
    [levels]
  );

  const levelsById = useMemo(() => {
    const m = {};
    levels.forEach(l => (m[l.id] = l));
    return m;
  }, [levels]);

  const roleLabel = colab => {
    if (colab.role_id && rolesById[colab.role_id]) return rolesById[colab.role_id].role;
    if (colab.role) return colab.role;
    return "—";
  };

  // Accessors para ordenação
  const colabAccessors = {
    nome:     c => (c.nome || c.employee || "").toLowerCase(),
    email:    c => (c.email || "").toLowerCase(),
    username: c => (c.username || "").toLowerCase(),
    role:     c => (roleLabel(c) || "").toLowerCase(),
    status:   c => (c.status ? 1 : 0),
  };

  const rolesAccessors = {
    role:          r => (r.role || "").toLowerCase(),
    access_level:  r => Number.isFinite(r.access_level) ? r.access_level : Number.POSITIVE_INFINITY,
    status:        r => (r.status ? 1 : 0),
  };

  // --- LISTAS FILTRADAS ---
  const colabsFiltered = useMemo(() => {
    const qn = colabFilterName.trim().toLowerCase();
    const qe = colabFilterEmail.trim().toLowerCase();
    const qr = colabFilterRole.trim().toLowerCase();
    return colabs.filter(c => {
      const nome = (c.nome || c.employee || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      const cargo = (roleLabel(c) || "").toLowerCase();
      return (!qn || nome.includes(qn)) &&
            (!qe || email.includes(qe)) &&
            (!qr || cargo.includes(qr));
    });
  }, [colabs, colabFilterName, colabFilterEmail, colabFilterRole, rolesById]);

  const rolesFiltered = useMemo(() => {
    const q = (roleFilter || "").trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(r => {
      const cargo = (r.role || "").toLowerCase();
      const nivelStr = Number.isFinite(r.access_level) ? String(r.access_level) : "";
      return cargo.includes(q) || nivelStr.includes(q);
    });
  }, [roles, roleFilter]);

  const levelsFiltered = useMemo(() => {
    const q = (levelFilter || "").trim().toLowerCase();
    if (!q) return levels;
    return levels.filter(l => {
      const nivelStr = Number.isFinite(l.access_level) ? String(l.access_level) : "";
      return nivelStr.includes(q);
    });
  }, [levels, levelFilter]);

  // --- LISTAS ORDENADAS (sobre as filtradas) ---
  const colabsView = useMemo(() => {
    const { key, dir } = colabSort;
    const acc = colabAccessors[key];
    if (!acc) return colabsFiltered;
    const arr = [...colabsFiltered];
    arr.sort((a, b) => {
      const va = acc(a), vb = acc(b);
      if (typeof va === "number" && typeof vb === "number") return dir === "asc" ? va - vb : vb - va;
      if (va > vb) return dir === "asc" ? 1 : -1;
      if (va < vb) return dir === "asc" ? -1 : 1;
      return 0;
    });
    return arr;
  }, [colabsFiltered, colabSort, rolesById]);

  const rolesView = useMemo(() => {
    const { key, dir } = roleSort;
    const acc = rolesAccessors[key] || rolesAccessors.access_level;
    const arr = [...rolesFiltered];
    arr.sort((a, b) => {
      const va = acc(a), vb = acc(b);
      if (typeof va === "number" && typeof vb === "number") return dir === "asc" ? va - vb : vb - va;
      if (va > vb) return dir === "asc" ? 1 : -1;
      if (va < vb) return dir === "asc" ? -1 : 1;
      return 0;
    });
    return arr;
  }, [rolesFiltered, roleSort]);

  function fetchColabs() {
    setLoading(true);
    setError("");
    setSuccess("");
    authFetch(`${API_URL}/company/employees?company_id=${user.company_id}`)
      .then(res => res.json())
      .then(data => setColabs(Array.isArray(data) ? data : []))
      .catch(() => setError("Erro ao buscar os dados de Administração."))
      .finally(() => setLoading(false));
  }

  function fetchRoles() {
    setRolesLoading(true);
    setRoleErr("");
    setRoleMsg("");
    authFetch(`${API_URL}/company/roles?company_id=${user.company_id}`)
      .then(res => res.json())
      .then(data => {
        const list = (data?.roles || []).sort((a, b) => {
          const la = Number.isFinite(a.access_level) ? a.access_level : Infinity;
          const lb = Number.isFinite(b.access_level) ? b.access_level : Infinity;
          if (la !== lb) return la - lb;
          return (a.role || "").localeCompare(b.role || "");
        });
        setRoles(list);
      })
      .catch(() => setRoles([]))
      .finally(() => setRolesLoading(false));
  }

  function fetchLevels() {
    setLevelsLoading(true);
    setLevelErr("");
    setLevelMsg("");
    authFetch(`${API_URL}/company/levels?company_id=${user.company_id}`)
      .then(res => res.json())
      .then(data => setLevels(Array.isArray(data?.levels) ? data.levels : []))
      .catch(() => setLevels([]))
      .finally(() => setLevelsLoading(false));
  }

  function openModal(colab = null) {
    setEditing(colab);
    if (colab) {
      let mappedRoleId = "";
      if (typeof colab.role_id === "number") mappedRoleId = colab.role_id;
      else if (colab.role) {
        const found = roles.find(r => (r.role || "").toLowerCase() === (colab.role || "").toLowerCase());
        mappedRoleId = found ? found.id : "";
      }
      setForm({
        nome: colab.nome || colab.employee || "",
        email: colab.email || "",
        username: colab.username || "",
        password: "",
        role_id: mappedRoleId,
        phone: colab.phone || "",
        cpf: colab.cpf || "",
      });
    } else {
      setForm({
        nome: "",
        email: "",
        username: "",
        password: "",
        role_id: roles.length ? roles[0].id : "",
        phone: "",
        cpf: "",
      });
    }
    setShowModal(true);
    setError("");
    setSuccess("");
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
    setForm({
      nome: "",
      email: "",
      username: "",
      password: "",
      role_id: roles.length ? roles[0].id : "",
      phone: "",
      cpf: "",
    });
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!form.nome || !form.username || (!editing && !form.password)) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }
    if (!form.role_id) {
      setError("Selecione um cargo.");
      return;
    }
    const method = editing ? "PUT" : "POST";
    const url = editing
      ? `${API_URL}/company/employees/${editing.id}?company_id=${user.company_id}`
      : `${API_URL}/company/employees?company_id=${user.company_id}`;
    const phone = (form.phone || "").trim();
    const cpf = (form.cpf || "").trim();
    let body;
    if (editing) {
      body = {
        employee: form.nome,
        email: form.email,
        username: form.username,
        role_id: form.role_id ? Number(form.role_id) : undefined,
        phone: phone === "" ? "" : phone,
        cpf: cpf === "" ? "" : cpf,
      };
      if (form.password) body.password = form.password;
    } else {
      body = {
        nome: form.nome,
        email: form.email,
        username: form.username,
        password: form.password,
        role_id: Number(form.role_id),
        phone: phone === "" ? "" : phone,
        cpf: cpf === "" ? "" : cpf,
      };
    }
    authFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.detail || "Erro ao salvar colaborador.");
        setSuccess(data.message || "Operação concluída!");
        fetchColabs();
        closeModal();
      })
      .catch(err => setError(err.message));
  }

  function handleInactivate(id) {
    if (!window.confirm("Confirma exclusão do colaborador?")) return;
    authFetch(`${API_URL}/company/employees/${id}?company_id=${user.company_id}`, { method: "DELETE" })
      .then(res => res.json())
      .then(() => {
        setSuccess("Colaborador excluído!");
        fetchColabs();
      })
      .catch(() => setError("Erro ao excluir colaborador."));
  }

  function openRoleModal(role = null) {
    setRoleEditing(role);
    setRoleForm(
      role
        ? { role: role.role || "", level_id: role.level_id ?? "" }
        : { role: "", level_id: levelsSorted[0]?.id ?? "" }
    );
    setRoleErr("");
    setRoleMsg("");
    setShowRoleModal(true);
  }

  function closeRoleModal() {
    setShowRoleModal(false);
    setRoleEditing(null);
    setRoleForm({ role: "", level_id: "" });
  }

  function onRoleFormChange(e) {
    const { name, value } = e.target;
    setRoleForm(f => ({ ...f, [name]: value }));
  }

  async function submitRole(e) {
    e.preventDefault();
    setRoleErr("");
    setRoleMsg("");
    if (!roleForm.role || !roleForm.level_id) {
      setRoleErr("Informe o nome do cargo e selecione um nível.");
      return;
    }
    const payload = {
      role: (roleForm.role || "").trim(),
      level_id: Number(roleForm.level_id),
      status: true,
    };
    try {
      if (roleEditing) {
        const res = await authFetch(
          `${API_URL}/company/roles/${roleEditing.id}?company_id=${user.company_id}`,
          { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.detail || "Erro ao atualizar cargo.");
        setRoleMsg("Cargo atualizado com sucesso!");
      } else {
        const res = await authFetch(
          `${API_URL}/company/roles?company_id=${user.company_id}`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.detail || "Erro ao criar cargo.");
        setRoleMsg("Cargo criado com sucesso!");
      }
      closeRoleModal();
      fetchRoles();
    } catch (err) {
      setRoleErr(err.message);
    }
  }

  async function deleteRole(roleId) {
    if (!window.confirm("Confirma exclusão (inativação) deste cargo?")) return;
    setRoleErr("");
    setRoleMsg("");
    try {
      const res = await authFetch(`${API_URL}/company/roles/${roleId}?company_id=${user.company_id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || "Erro ao excluir cargo.");
      setRoleMsg("Cargo excluído (inativado) com sucesso!");
      fetchRoles();
    } catch (err) {
      setRoleErr(err.message);
    }
  }

  function openPermModalForCreate() {
    setEditingLevel(null);
    setPermModalLevelInput("");
    setPermModalPerms(EMPTY_PERMS);
    setPermModalErr("");
    setPermModalOpen(true);
  }

  function openPermModalForEdit(levelId) {
    const entry = levelsById[levelId];
    const filled = { ...EMPTY_PERMS };

    const pages = Array.isArray(entry?.allowed_pages) ? entry.allowed_pages : [];

    if (pages.includes("all_pages")) {
      Object.keys(filled).forEach(k => (filled[k] = true));
    } else {
      pages.forEach(k => {
        if (k in filled) filled[k] = true;
      });
      filled.config_root = ALL_CONFIGS.every(k => !!filled[k]);
    }

    setEditingLevel(levelId);
    setPermModalLevelInput(String(entry?.access_level ?? ""));
    setPermModalPerms(filled);
    setPermModalErr("");
    setPermModalOpen(true);
  }

  function togglePermKey(key) {
    setPermModalPerms(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (key === "config_root") {
        ALL_CONFIGS.forEach(k => { next[k] = next.config_root; });
      }
      if (ALL_CONFIGS.includes(key)) {
        next.config_root = ALL_CONFIGS.every(k => !!next[k]);
      }
      return next;
    });
  }

  async function savePermModal() {
    const lvl = Number(permModalLevelInput);
    if (!lvl || lvl < 1) {
      setPermModalErr("Informe um nível válido (número inteiro maior que 0).");
      return;
    }

    let allowed;
    if (permModalPerms.config_root) {
      allowed = ["all_pages"];
    } else {
      allowed = Object.keys(permModalPerms).filter(k => permModalPerms[k] && k !== "config_root");
    }

    try {
      if (editingLevel) {
        const res = await authFetch(
          `${API_URL}/company/levels/${editingLevel}?company_id=${user.company_id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_level: lvl, allowed_pages: allowed }),
          }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.detail || "Erro ao atualizar nível.");
        setLevelMsg("Nível atualizado com sucesso!");
      } else {
        if (!user?.id) {
          setPermModalErr("Usuário inválido para definir o nível.");
          return;
        }
        const res = await authFetch(
          `${API_URL}/company/levels?company_id=${user.company_id}&created_by=${user.id}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_level: lvl, allowed_pages: allowed }),
          }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.detail || "Erro ao criar nível.");
        setLevelMsg("Nível criado com sucesso!");
      }
      setPermModalOpen(false);
      fetchLevels();
    } catch (err) {
      setPermModalErr(err.message);
    }
  }

  async function deleteLevel(levelId) {
    if (!window.confirm("Confirma exclusão deste nível?")) return;
    setLevelErr("");
    setLevelMsg("");
    try {
      const res = await authFetch(`${API_URL}/company/levels/${levelId}?company_id=${user.company_id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || "Erro ao excluir nível.");
      setLevelMsg("Nível removido com sucesso!");
      fetchLevels();
    } catch (err) {
      setLevelErr(err.message);
    }
  }

  function labelsForAllowedPages(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return [];
    if (arr.includes("all_pages")) return ["Todas as páginas"];

    const map = Object.fromEntries(PERMISSION_OPTIONS.map(o => [o.key, o.label]));
    return arr.filter(k => k in map).map(k => map[k]);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-center">Cadastrar Colaboradores</h2>
      <div className="mb-4 flex items-center gap-3 justify-between">
        <button
          onClick={() => openModal()}
          className="bg-primary text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-purple-700 transition"
        >
          Novo Colaborador
        </button>

        <div className="flex w-full max-w-2xl gap-2">
          <input
            type="search"
            value={colabFilterName}
            onChange={e => setColabFilterName(e.target.value)}
            placeholder="Filtrar por nome"
            className="input flex-1"
          />
          <input
            type="search"
            value={colabFilterEmail}
            onChange={e => setColabFilterEmail(e.target.value)}
            placeholder="Filtrar por e-mail"
            className="input flex-1"
          />
          <input
            type="search"
            value={colabFilterRole}
            onChange={e => setColabFilterRole(e.target.value)}
            placeholder="Filtrar por cargo"
            className="input flex-1"
          />
        </div>
      </div>

      {success && <div className="mb-4 p-2 bg-green-100 text-green-700 rounded">{success}</div>}
      {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>}

      <table className="w-full bg-white rounded-xl shadow text-sm overflow-hidden">
        <thead>
          <tr className="bg-[#5A2EBB] text-white">
            <th className="py-3 px-2 text-left cursor-pointer select-none" onClick={() => toggleColabSort("nome")}>
              Nome {sortIcon(colabSort, "nome")}
            </th>
            <th className="py-3 px-2 text-left cursor-pointer select-none" onClick={() => toggleColabSort("email")}>
              E-mail {sortIcon(colabSort, "email")}
            </th>
            <th className="py-3 px-2 text-left cursor-pointer select-none" onClick={() => toggleColabSort("username")}>
              Usuário {sortIcon(colabSort, "username")}
            </th>
            <th className="py-3 px-2 text-center cursor-pointer select-none" onClick={() => toggleColabSort("role")}>
              Cargo {sortIcon(colabSort, "role")}
            </th>
            <th className="py-3 px-2 text-center cursor-pointer select-none" onClick={() => toggleColabSort("status")}>
              Status {sortIcon(colabSort, "status")}
            </th>
            <th className="py-3 px-2 text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={6} className="py-8 text-center text-gray-500">Carregando…</td></tr>
          ) : colabsView.length > 0 ? (
            colabsView.map(colab => (
              <tr key={colab.id} className="border-t">
                <td className="py-2 px-2">{colab.nome || colab.employee}</td>
                <td className="py-2 px-2">{colab.email}</td>
                <td className="py-2 px-2">{colab.username}</td>
                <td className="py-2 px-2 text-center">{roleLabel(colab)}</td>
                <td className="py-2 px-2 text-center">
                  {colab.status ? (
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">Ativo</span>
                  ) : (
                    <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Inativo</span>
                  )}
                </td>
                <td className="py-2 px-2 text-center">
                  <button className="text-primary font-bold mr-2 hover:underline" onClick={() => openModal(colab)}>|Editar|</button>
                  {colab.status && (
                    <button className="text-red-600 font-bold hover:underline" onClick={() => handleInactivate(colab.id)}>|Excluir|</button>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr><td colSpan={6} className="py-8 text-center text-gray-500">Nenhum colaborador encontrado.</td></tr>
          )}
        </tbody>
      </table>

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4 text-center">Cadastrar Cargos</h2>

        {/* Barra de ações + filtro (Cargos) */}
        <div className="flex items-center justify-between mb-4 gap-3">
          <button
            onClick={() => openRoleModal()}
            className="bg-primary text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-purple-700 transition"
          >
            Novo Cargo
          </button>
          <input
            type="search"
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            placeholder="Filtrar por cargo ou nível de acesso"
            className="input w-full max-w-md"
          />
        </div>

        {roleMsg && <div className="mb-4 p-2 bg-green-100 text-green-700 rounded">{roleMsg}</div>}
        {roleErr && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{roleErr}</div>}

        <div className="overflow-x-auto rounded-xl shadow bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#5A2EBB] text-white">
                <th className="p-2 text-center cursor-pointer select-none" onClick={() => toggleRoleSort("role")}>
                  Cargo {sortIcon(roleSort, "role")}
                </th>
                <th className="p-2 text-center cursor-pointer select-none" onClick={() => toggleRoleSort("access_level")}>
                  Nível de Acesso {sortIcon(roleSort, "access_level")}
                </th>
                <th className="p-2 text-center cursor-pointer select-none" onClick={() => toggleRoleSort("status")}>
                  Status {sortIcon(roleSort, "status")}
                </th>
                <th className="p-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rolesLoading ? (
                <tr><td colSpan={4} className="py-6 text-center text-gray-500">Carregando…</td></tr>
              ) : rolesView.length > 0 ? (
                rolesView.map(r => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2 text-center">{r.role}</td>
                    <td className="p-2 text-center">{Number.isFinite(r.access_level) ? r.access_level : "-"}</td>
                    <td className="p-2 text-center">
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">Ativo</span>
                    </td>
                    <td className="p-2 text-center">
                      <button className="text-primary font-bold mr-2 hover:underline" onClick={() => openRoleModal(r)}>|Editar|</button>
                      <button className="text-red-600 font-bold hover:underline" onClick={() => deleteRole(r.id)}>|Excluir|</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4} className="py-6 text-center text-gray-500">Nenhum cargo encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4 text-center">Cadastrar Níveis de Acesso</h2>

        {/* Barra de ações + filtro (Níveis) */}
        <div className="flex items-center justify-between mb-4 gap-3">
          <button
            onClick={() => {
              // abrir modal de criação
              setEditingLevel(null);
              setPermModalLevelInput("");
              setPermModalPerms(EMPTY_PERMS);
              setPermModalErr("");
              setPermModalOpen(true);
            }}
            className="bg-primary text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-purple-700 transition"
          >
            Novo Nível de Acesso
          </button>
          <input
            type="search"
            value={levelFilter}
            onChange={e => setLevelFilter(e.target.value)}
            placeholder="Filtrar por nível de acesso"
            className="input w-full max-w-md"
          />
        </div>

        {levelMsg && <div className="mb-4 p-2 bg-green-100 text-green-700 rounded">{levelMsg}</div>}
        {levelErr && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{levelErr}</div>}

        <div className="overflow-x-auto rounded-xl shadow bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#5A2EBB] text-white">
                <th className="p-2 text-center">Nível de Acesso</th>
                <th className="p-2 text-left">Permissões</th>
                <th className="p-2 text-center">Definido por</th>
                <th className="p-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {levelsLoading ? (
                <tr><td colSpan={4} className="py-6 text-center text-gray-500">Carregando…</td></tr>
              ) : levelsFiltered.length === 0 ? (
                <tr><td colSpan={4} className="py-6 text-center text-gray-500">Nenhum nível encontrado.</td></tr>
              ) : (
                // mantém ordenação fixa por nível
                [...levelsFiltered].sort((a, b) => (a.access_level ?? 1e9) - (b.access_level ?? 1e9)).map(lvl => {
                  const labels = labelsForAllowedPages(lvl.allowed_pages);
                  const by = lvl.defined_by || "—";
                  return (
                    <tr key={lvl.id} className="border-t">
                      <td className="p-2 text-center font-semibold">Nível {lvl.access_level}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {labels.length > 0 ? (
                            labels.map(l => (
                              <span
                                key={l}
                                className={"px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700" }
                              >
                                {l}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-500">Sem permissões</span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-center">{by}</td>
                      <td className="p-2 text-center">
                        <button
                          className="text-primary font-bold mr-2 hover:underline"
                          onClick={() => openPermModalForEdit(lvl.id)}
                        >
                          |Editar|
                        </button>
                        <button
                          className="text-red-600 font-bold hover:underline"
                          onClick={() => deleteLevel(lvl.id)}
                        >
                          |Excluir|
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL Colaborador */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl w-full max-w-xl relative">
            <button className="absolute top-2 right-4 text-gray-500 hover:text-red-700 text-2xl" onClick={closeModal}>×</button>
            <h3 className="text-xl font-bold mb-4">{editing ? "Editar Colaborador" : "Novo Colaborador"}</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input type="text" name="nome" placeholder="Nome" className="input" value={form.nome} onChange={handleChange} required />
              <input type="email" name="email" placeholder="E-mail" className="input" value={form.email} onChange={handleChange} />
              <input type="text" name="username" placeholder="Usuário" className="input" value={form.username} onChange={handleChange} required />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input type="text" name="phone" placeholder="Telefone (DDD+Número)" className="input" value={form.phone} onChange={handleChange} />
                <input type="text" name="cpf" placeholder="CPF" className="input" value={form.cpf} onChange={handleChange} />
              </div>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} name="password" placeholder="Senha" className="input pr-10" value={form.password} onChange={handleChange} required={!editing} />
                <button type="button" className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-primary" onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <select name="role_id" className="input" value={form.role_id} onChange={handleChange} required>
                {roles.length === 0 ? (
                  <option value="">— Nenhum cargo ativo —</option>
                ) : (
                  roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.role}{Number.isFinite(r.access_level) ? ` (Nível ${r.access_level})` : ""}
                    </option>
                  ))
                )}
              </select>
              <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-purple-700 transition w-full font-bold">
                {editing ? "Salvar Alterações" : "Criar Colaborador"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL Cargo */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl w-full max-w-md relative">
            <button className="absolute top-2 right-4 text-gray-500 hover:text-red-700 text-2xl" onClick={closeRoleModal}>×</button>
            <h3 className="text-xl font-bold mb-4">{roleEditing ? "Editar Cargo" : "Novo Cargo"}</h3>
            {roleErr && <div className="mb-3 p-2 bg-red-100 text-red-700 rounded">{roleErr}</div>}
            {roleMsg && <div className="mb-3 p-2 bg-green-100 text-green-700 rounded">{roleMsg}</div>}
            <form onSubmit={submitRole} className="flex flex-col gap-3">
              <input type="text" name="role" placeholder="Nome do cargo (ex.: Financeiro, RH, Supervisor)" className="input" value={roleForm.role} onChange={onRoleFormChange} required />
              <select name="level_id" className="input" value={roleForm.level_id} onChange={onRoleFormChange} required>
                {levelsSorted.length === 0 ? (
                  <option value="">— Nenhum nível ativo —</option>
                ) : (
                  levelsSorted.map(l => (
                    <option key={l.id} value={l.id}>
                      Nível {l.access_level}
                    </option>
                  ))
                )}
              </select>
              <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-purple-700 transition w-full font-bold">
                {roleEditing ? "Salvar Cargo" : "Criar Cargo"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL Nível */}
      {permModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl w-full max-w-3xl relative">
            <button className="absolute top-2 right-4 text-gray-500 hover:text-red-700 text-2xl" onClick={() => setPermModalOpen(false)}>×</button>
            <h3 className="text-xl font-bold mb-4">{editingLevel ? "Editar Nível" : "Definir Nível de Acesso"}</h3>

            {!!permModalErr && <div className="mb-3 p-2 bg-red-100 text-red-700 rounded">{permModalErr}</div>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm mb-1 font-semibold">Nível</label>
                <input
                  type="number"
                  className="input w-full"
                  placeholder="ex.: 4"
                  value={permModalLevelInput}
                  onChange={e => setPermModalLevelInput(e.target.value)}
                  min={1}
                />
              </div>
              <br/>
              <div className="md:col-span-2 min-w-[700px]">
                <label className="block text-sm mb-2 font-semibold">Permissões</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {PERMISSION_OPTIONS.map((opt) => {
                    const isRoot = opt.key === "config_root";
                    return (
                      <label
                        key={opt.key}
                        className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition
                          ${isRoot
                            ? "bg-primary text-white shadow-sm hover:bg-primary/90"
                            : "border hover:bg-gray-50"}`}
                      >
                        <input
                          type="checkbox"
                          checked={!!permModalPerms[opt.key]}
                          onChange={() => togglePermKey(opt.key)}
                          className={isRoot ? "accent-white" : "accent-purple-600"}
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button className="px-4 py-2 rounded-lg border hover:bg-gray-50" onClick={() => setPermModalOpen(false)}>Cancelar</button>
              <button className="bg-primary text-white px-5 py-2 rounded-lg font-bold shadow hover:bg-purple-700 transition" onClick={savePermModal}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
