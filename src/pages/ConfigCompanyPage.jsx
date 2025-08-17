import React, { useEffect, useState } from "react";
import { authFetch } from "../utils/authFetch";
import { useAuth } from "../utils/authData";

const API_URL = import.meta.env.VITE_API_URL;

export default function ConfigCompanyPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    authFetch(`${API_URL}/company/profile?company_id=${user.company_id}`)
      .then(res => res.json())
      .then(data => setProfile(data))
      .catch(() => setError("Erro ao carregar perfil da empresa."))
      .finally(() => setLoading(false));
  }, [user.company_id]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    authFetch(`${API_URL}/company/profile?company_id=${user.company_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    })
      .then(res => res.json())
      .then(data => setMessage(data.message || "Salvo com sucesso!"))
      .catch(() => setError("Erro ao salvar alterações."))
      .finally(() => setSaving(false));
  }

  if (loading) return <div className="p-6">Carregando...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!profile) return null;

  return (
    <div className="p-6 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center">Configuração da Empresa</h2>
        {message && (
            <div className="fixed bottom-8 right-8 bg-green-600 text-white px-6 py-3 rounded-xl shadow-xl z-50 animate-fade-in-up font-semibold transition">
                {message}
            </div>
        )}
        {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>}
        <form onSubmit={handleSave} className="space-y-6">
        {/* Dados da empresa */}
        <div>
          <h3 className="font-semibold mb-2 text-primary">Dados da Empresa</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm">Nome Fantasia:</label>
              <input name="nome_fantasia" className="input" value={profile.nome_fantasia || ""} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm">Razão Social:</label>
              <input name="razao_social" className="input" value={profile.razao_social || ""} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm">CNPJ:</label>
              <input name="cnpj" className="input" value={profile.cnpj || ""} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm">Email:</label>
              <input name="email" className="input" value={profile.email || ""} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm">WhatsApp:</label>
              <input name="whatsapp" className="input" value={profile.whatsapp || ""} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm">Endereço:</label>
              <input name="endereco" className="input" value={profile.endereco || ""} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm">Logo (URL):</label>
              <input name="logo_url" className="input" value={profile.logo_url || ""} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Plano (apenas leitura) */}
        <div>
          <h3 className="font-semibold mb-2 text-primary">Plano Atual</h3>
          <input className="input font-bold bg-gray-100" value={profile.plan_id === 2 ? "Premium" :profile.plan_id === 1 ? "Standard" :""} disabled />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-primary text-white px-8 py-2 rounded-lg shadow hover:bg-purple-700 transition font-bold"
        >
          {saving ? "Salvando..." : "Salvar Alterações"}
        </button>
      </form>
    </div>
  );
}
