import React, { useEffect, useState } from "react";
import DateFilters from "../components/DateFilters";
import { getDefaultFilters } from "../utils/dateUtils";
import { authFetch } from "../utils/authFetch";

export default function MessagesPage({ filters: filtersProp }) {
  const [filters, setFilters] = useState(() => filtersProp && filtersProp.start && filtersProp.end ? filtersProp : getDefaultFilters());
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
      if (filters.start && filters.end) {
        authFetch(`http://localhost:8000/admin/messages?start_date=${filters.start}&end_date=${filters.end}`)
          .then(res => {
            if (!res.ok) throw new Error("Erro ao buscar mensagens");
            return res.json();
          })
          .then(data => setMessages(data.messages || []))
          .catch(() => setError("Não foi possível carregar mensagens."))
          .finally(() => setLoading(false));
      }
    }, [filters]);

  if (loading) return <div className="p-6">Carregando mensagens...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Mensagens</h2>
      <DateFilters initialStart={filters.start} initialEnd={filters.end} onApply={setFilters} />
      {loading ? (
        <div>Carregando mensagens...</div>
      ) : (
        <table className="w-full bg-white rounded-xl shadow text-sm">
          <thead>
            <tr>
              <th>Telefone</th>
              <th>Mensagem Usuário</th>
              <th>Resposta Bot</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((msg, i) => (
              <tr key={i} className="border-t">
                <td>{msg.user_phone}</td>
                <td>{msg.user_message}</td>
                <td>{msg.bot_response}</td>
                <td>{msg.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
