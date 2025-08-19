import React, { useEffect, useState, useMemo } from "react";
import { authFetch } from "../utils/authFetch";
import { useAuth } from "../utils/authData";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL;

export default function ConfigEmployeePage() {
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
  const [roleForm, setRoleForm] = useState({ role: "", access_level: "" });

  useEffect(() => {
    fetchColabs();
    fetchRoles();
  }, []);

  const rolesById = useMemo(() => {
    const m = {};
    roles.forEach((r) => (m[r.id] = r));
    return m;
  }, [roles]);

  const roleLabel = (colab) => {
    if (colab.role_id && rolesById[colab.role_id]) {
      const r = rolesById[colab.role_id];
      return r.role;
    }
    if (colab.role) return colab.role;
    return "—";
  };

  function fetchColabs() {
    setLoading(true);
    setError(""); setSuccess("");
    authFetch(`${API_URL}/company/employees?company_id=${user.company_id}`)
      .then(res => res.json())
      .then(data => setColabs(Array.isArray(data) ? data : []))
      .catch(() => setError("Erro ao buscar colaboradores."))
      .finally(() => setLoading(false));
  }

  function openModal(colab = null) {
    setEditing(colab);

    if (colab) {
      let mappedRoleId = "";
      if (typeof colab.role_id === "number") {
        mappedRoleId = colab.role_id;
      } else if (colab.role) {
        const found = roles.find((r) => (r.role || "").toLowerCase() === (colab.role || "").toLowerCase());
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
    setError(""); setSuccess("");
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
    setError(""); setSuccess("");

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
      body: JSON.stringify(body)
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

  // ---------------------------
  // CARGOS / ROLES
  // ---------------------------
  function fetchRoles() {
    setRolesLoading(true);
    setRoleErr(""); setRoleMsg("");
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

  function openRoleModal(role = null) {
    setRoleEditing(role);
    setRoleForm(role ? {
      role: role.role || "",
      access_level: role.access_level ?? ""
    } : { role: "", access_level: "" });
    setRoleErr(""); setRoleMsg("");
    setShowRoleModal(true);
  }

  function closeRoleModal() {
    setShowRoleModal(false);
    setRoleEditing(null);
    setRoleForm({ role: "", access_level: "" });
  }

  function onRoleFormChange(e) {
    const { name, value } = e.target;
    setRoleForm(f => ({ ...f, [name]: value }));
  }

  async function submitRole(e) {
    e.preventDefault();
    setRoleErr(""); setRoleMsg("");
    const payload = {
      role: (roleForm.role || "").trim(),
      access_level: roleForm.access_level === "" ? null : Number(roleForm.access_level),
      status: true
    };
    if (!payload.role) {
      setRoleErr("Informe o nome do cargo.");
      return;
    }

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
    setRoleErr(""); setRoleMsg("");
    try {
      const res = await authFetch(
        `${API_URL}/company/roles/${roleId}?company_id=${user.company_id}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || "Erro ao excluir cargo.");
      setRoleMsg("Cargo excluído (inativado) com sucesso!");
      fetchRoles();
    } catch (err) {
      setRoleErr(err.message);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* COLABORADORES */}
      <h2 className="text-2xl font-bold mb-4 text-center">Gestão de Colaboradores</h2>

      <button
        onClick={() => openModal()}
        className="mb-6 bg-primary text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-purple-700 transition"
      >
        Novo Colaborador
      </button>

      {success && <div className="mb-4 p-2 bg-green-100 text-green-700 rounded">{success}</div>}
      {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>}

      <table className="w-full bg-white rounded-xl shadow text-sm overflow-hidden">
        <thead>
          <tr className="bg-[#5A2EBB] text-white">
            <th className="py-3 px-2 text-left">Nome</th>
            <th className="py-3 px-2 text-left">E-mail</th>
            <th className="py-3 px-2 text-left">Usuário</th>
            <th className="py-3 px-2 text-center">Cargo</th>
            <th className="py-3 px-2 text-center">Status</th>
            <th className="py-3 px-2 text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={6} className="py-8 text-center text-gray-500">Carregando…</td></tr>
          ) : colabs.length > 0 ? (
            colabs.map(colab => (
              <tr key={colab.id} className="border-t">
                <td className="py-2 px-2">{colab.nome || colab.employee}</td>
                <td className="py-2 px-2">{colab.email}</td>
                <td className="py-2 px-2">{colab.username}</td>
                <td className="py-2 px-2 text-center">{roleLabel(colab)}</td>
                <td className="py-2 px-2 text-center">
                  {colab.status
                    ? <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">Ativo</span>
                    : <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Inativo</span>
                  }
                </td>
                <td className="py-2 px-2 text-center">
                  <button className="text-primary font-bold mr-2 hover:underline" onClick={() => openModal(colab)}>|Editar| </button>
                  {colab.status && (
                    <button className="text-red-600 font-bold hover:underline" onClick={() => handleInactivate(colab.id)}> |Excluir| </button>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr><td colSpan={6} className="py-8 text-center text-gray-500">Nenhum colaborador cadastrado.</td></tr>
          )}
        </tbody>
      </table>

      {/* CARGOS */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4 text-center">Gestão de Cargos</h2>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => openRoleModal()}
            className="bg-primary text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-purple-700 transition"
          >
            Novo Cargo
          </button>
        </div>

        {roleMsg && <div className="mb-4 p-2 bg-green-100 text-green-700 rounded">{roleMsg}</div>}
        {roleErr && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{roleErr}</div>}

        <div className="overflow-x-auto rounded-xl shadow bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#5A2EBB] text-white">
                <th className="p-2 text-center">Cargo</th>
                <th className="p-2 text-center">Nível de Acesso</th>
                <th className="p-2 text-center">Status</th>
                <th className="p-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rolesLoading ? (
                <tr><td colSpan={4} className="py-6 text-center text-gray-500">Carregando…</td></tr>
              ) : roles.length > 0 ? (
                roles.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2 text-center">{r.role}</td>
                    <td className="p-2 text-center">{Number.isFinite(r.access_level) ? r.access_level : "-"}</td>
                    <td className="p-2 text-center">
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">Ativo</span>
                    </td>
                    <td className="p-2 text-center">
                      <button
                        className="text-primary font-bold mr-2 hover:underline"
                        onClick={() => openRoleModal(r)}
                      >
                        |Editar|
                      </button>
                      <button
                        className="text-red-600 font-bold hover:underline"
                        onClick={() => deleteRole(r.id)}
                      >
                        |Excluir|
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4} className="py-6 text-center text-gray-500">Nenhum cargo cadastrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL — Novo/Editar Colaborador */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl w-full max-w-xl animate-fade-in-up relative">
            <button
              className="absolute top-2 right-4 text-gray-500 hover:text-red-700 text-2xl"
              onClick={closeModal}
            >×</button>
            <h3 className="text-xl font-bold mb-4">{editing ? "Editar Colaborador" : "Novo Colaborador"}</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="text"
                name="nome"
                placeholder="Nome"
                className="input"
                value={form.nome}
                onChange={handleChange}
                required
              />
              <input
                type="email"
                name="email"
                placeholder="E-mail"
                className="input"
                value={form.email}
                onChange={handleChange}
              />
              <input
                type="text"
                name="username"
                placeholder="Usuário"
                className="input"
                value={form.username}
                onChange={handleChange}
                required
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  name="phone"
                  placeholder="Telefone (DDD+Número)"
                  className="input"
                  value={form.phone}
                  onChange={handleChange}
                />
                <input
                  type="text"
                  name="cpf"
                  placeholder="CPF"
                  className="input"
                  value={form.cpf}
                  onChange={handleChange}
                />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Senha"
                  className="input pr-10"
                  value={form.password}
                  onChange={handleChange}
                  required={!editing}
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-primary"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              {/* cargos dinâmicos */}
              <select
                name="role_id"
                className="input"
                value={form.role_id}
                onChange={handleChange}
                required
              >
                {roles.length === 0 ? (
                  <option value="">— Nenhum cargo ativo —</option>
                ) : (
                  roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.role}{Number.isFinite(r.access_level) ? ` (Nível ${r.access_level})` : ""}
                    </option>
                  ))
                )}
              </select>

              <button
                type="submit"
                className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-purple-700 transition w-full font-bold"
              >
                {editing ? "Salvar Alterações" : "Criar Colaborador"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL — Novo/Editar Cargo */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl w-full max-w-md animate-fade-in-up relative">
            <button
              className="absolute top-2 right-4 text-gray-500 hover:text-red-700 text-2xl"
              onClick={closeRoleModal}
            >×</button>
            <h3 className="text-xl font-bold mb-4">{roleEditing ? "Editar Cargo" : "Novo Cargo"}</h3>

            {roleErr && <div className="mb-3 p-2 bg-red-100 text-red-700 rounded">{roleErr}</div>}
            {roleMsg && <div className="mb-3 p-2 bg-green-100 text-green-700 rounded">{roleMsg}</div>}

            <form onSubmit={submitRole} className="flex flex-col gap-3">
              <input
                type="text"
                name="role"
                placeholder="Nome do cargo (ex.: Financeiro, RH, Supervisor)"
                className="input"
                value={roleForm.role}
                onChange={onRoleFormChange}
                required
              />
              <input
                type="number"
                name="access_level"
                placeholder="Nível de Acesso (0-5)"
                className="input"
                value={roleForm.access_level}
                onChange={onRoleFormChange}
                min={0}
              />
              <button
                type="submit"
                className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-purple-700 transition w-full font-bold"
              >
                {roleEditing ? "Salvar Cargo" : "Criar Cargo"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
