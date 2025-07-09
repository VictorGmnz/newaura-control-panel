import React, { useEffect, useState } from "react";
import DateFilters from "../components/DateFilters";
import { getDefaultFilters } from "../utils/dateUtils";
import { authFetch } from "../utils/authFetch";
import { useAuth } from '../utils/authData';
import { Navigate } from "react-router-dom";

export default function MessagesPage({ filters: filtersProp }) {
  const [filters, setFilters] = useState(() =>
    filtersProp && filtersProp.start && filtersProp.end
      ? filtersProp
      : getDefaultFilters()
  );
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filtersAppliedManually, setFiltersAppliedManually] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL;
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const COMPANY_ID = user? user.company_id: 0;

  function handleApplyFilters(newFilters) {
    setFilters(newFilters);
    setFiltersAppliedManually(true);
    setMessage("Filtros aplicados!");
    setTimeout(() => setMessage(""), 2000); // Some depois de 2 segundos
  }

  useEffect(() => {
    if (filters.start && filters.end) {
      let url = `${API_URL}/admin/messages?start_date=${filters.start}&end_date=${filters.end}&company_id=${COMPANY_ID}`;
      if (filters.phone) url += `&phone=55${encodeURIComponent(filters.phone)}`;
      authFetch(url)
        .then(res => {
          if (!res.ok) throw new Error("Erro ao buscar mensagens");
          return res.json();
        })
        .then(data => setMessages(data.messages || []))
        .catch(() => setError("Não foi possível carregar mensagens. Tente novamente mais tarde."))
        .finally(() => setLoading(false));
    }
  }, [filters]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Mensagens</h2>
      <DateFilters
        initialStart={filters.start}
        initialEnd={filters.end}
        initialPhone={filters.phone}
        onApply={handleApplyFilters}
      />
      {filtersAppliedManually && !!message && (
        <div className="mb-4 p-2 bg-green-100 text-green-700 rounded shadow text-center font-semibold w-[422px]">
          {message}
        </div>
      )}
      {loading ? (
        <div>Carregando mensagens...</div>
      ) : (
        <table className="w-full bg-white rounded-xl shadow text-sm overflow-hidden">
          <thead>
            <tr className="bg-[#5A2EBB] text-white">
              <th className="py-3 px-2 text-center font-bold border-r border-white">Telefone</th>
              <th className="py-3 px-2 text-center font-bold border-r border-white">Mensagem Usuário</th>
              <th className="py-3 px-2 text-center font-bold border-r border-white">Resposta Bot</th>
              <th className="py-3 px-2 w-[100px] text-center font-bold">Data</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((msg, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                <td className="py-2 px-2 text-center font-mono border-r border-gray-200">{msg.user_phone}</td>
                <td className="py-2 px-2 border-r border-gray-200">{msg.user_message}</td>
                <td className="py-2 px-2 border-r border-gray-200">{msg.bot_response}</td>
                <td className="py-2 px-2 text-center">{msg.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
