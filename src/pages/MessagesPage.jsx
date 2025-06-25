import React, { useEffect, useState } from "react";

export default function MessagesPage({ filters }) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (filters.start && filters.end) {
      fetch(`http://localhost:8000/admin/messages?start_date=${filters.start}&end_date=${filters.end}`)
        .then(res => res.json())
        .then(data => setMessages(data.messages || []));
    }
  }, [filters]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Mensagens</h2>
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
    </div>
  );
}
