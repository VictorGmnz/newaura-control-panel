import React from "react";
import { useNavigate } from "react-router-dom";

export default function LastConversationsTable({ conversations }) {
  const navigate = useNavigate();

  function handleGoToConversation(c) {
    // só leva se estiver ativa
    if (c.status !== "Ativa") return;
    const qs = new URLSearchParams();
    if (c.phone) qs.set("phone", String(c.phone));
    navigate(`/conversas-ativas?${qs.toString()}`);
  }

  return (
    <div className="bg-white p-4 rounded-xl shadow w-full overflow-x-auto">
      <h3 className="font-semibold mb-2 text-primary">Últimas conversas</h3>
      <table className="min-w-full text-xs md:text-sm">
        <thead>
          <tr>
            <th className="py-2 px-3 text-left">Contato</th>
            <th className="py-2 px-3 text-left">Data</th>
            <th className="py-2 px-3 text-left">Última mensagem</th>
            <th className="py-2 px-3 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {conversations.map((c, i) => (
            <tr
              key={i}
              className={`border-t ${
                c.status === "Ativa" ? "cursor-pointer hover:bg-gray-50" : ""
              }`}
              onClick={() => handleGoToConversation(c)}
            >
              <td className="py-2 px-3">
                {c.name ? c.name : "Nome não informado"} - {c.phone}
              </td>
              <td className="py-2 px-3">{c.date}</td>
              <td className="py-2 px-3">{c.message}</td>
              <td className="py-2 px-3">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-bold ${
                    c.status === "Ativa"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {c.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
