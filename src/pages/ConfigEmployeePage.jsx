import React, { useEffect, useState } from "react";
import { authFetch } from "../utils/authFetch";
import { useAuth } from "../utils/authData";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL;
const ROLES = [
  { value: "Administrador", label: "Administrador" },
  { value: "Supervisor", label: "Supervisor" },
  { value: "Colaborador", label: "Colaborador" },
];

export default function ConfigEmployeePage() {
  const { user } = useAuth();
  const [colabs, setColabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nome: "", email: "", username: "", password: "", role: "Colaborador" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchColabs();
  }, []);

  function fetchColabs() {
    setLoading(true);
    authFetch(`${API_URL}/company/employees?company_id=${user.company_id}`)
      .then(res => res.json())
      .then(data => setColabs(data))
      .catch(() => setError("Erro ao buscar colaboradores."))
      .finally(() => setLoading(false));
  }

  function openModal(colab = null) {
    setEditing(colab);
    setForm(
      colab
        ? { ...colab, password: "" }
        : { nome: "", email: "", username: "", password: "", role: "Colaborador" }
    );
    setShowModal(true);
    setError("");
    setSuccess("");
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
    setForm({ nome: "", email: "", username: "", password: "", role: "Colaborador" });
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
    const method = editing ? "PUT" : "POST";
    const url = editing
      ? `${API_URL}/company/employees/${editing.id}?company_id=${user.company_id}`
      : `${API_URL}/company/employees?company_id=${user.company_id}`;

    let body;
    if (editing) {
      body = { ...form, employee: form.nome };
      delete body.nome;
    } else {
      body = { ...form };
    }

    if (editing && !form.password) delete body.password;

    authFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
      .then(res => res.json())
      .then(data => {
        if (data.detail) setError(data.detail);
        else {
          setSuccess(data.message);
          fetchColabs();
          closeModal();
        }
      })
      .catch(() => setError("Erro ao salvar colaborador."));
  }

  function handleInactivate(id) {
    if (!window.confirm("Confirma exclusão do colaborador?")) return;
    authFetch(`${API_URL}/company/employees/${id}?company_id=${user.company_id}`, { method: "DELETE" })
      .then(res => res.json())
      .then(() => {
        setSuccess("Colaborador excluido!");
        fetchColabs();
      })
      .catch(() => setError("Erro ao excluir colaborador."));
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Gestão de Colaboradores</h2>

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
          {colabs.map(colab => (
            <tr key={colab.id} className="border-t">
              <td className="py-2 px-2">{colab.nome}</td>
              <td className="py-2 px-2">{colab.email}</td>
              <td className="py-2 px-2">{colab.username}</td>
              <td className="py-2 px-2 text-center">
                {ROLES.find(r => r.value === colab.role)?.label || colab.role}
              </td>
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
          ))}
          {colabs.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-gray-500">Nenhum colaborador cadastrado.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl w-full max-w-md animate-fade-in-up relative">
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
              <select
                name="role"
                className="input"
                value={form.role}
                onChange={handleChange}
                required
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
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
    </div>
  );
}
