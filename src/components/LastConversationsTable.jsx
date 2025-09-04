// components/LastConversationsTable.jsx
import React from "react";

function fmtDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  const pad = (n) => String(n).padStart(2, "0");
  const dd = pad(d.getDate());
  const mm = pad(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

export default function LastConversationsTable({ conversations = [] }) {
  return (
    <div className="bg-white shadow rounded-xl p-4 h-full overflow-hidden">
      <h3 className="font-bold text-lg mb-3">Últimas conversas</h3>
      <div className="overflow-auto max-h-[420px] pr-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="pb-2">Contato</th>
              <th className="pb-2">Data</th>
              <th className="pb-2 text-center whitespace-nowrap">Sessão</th>
              <th className="pb-2">Última mensagem</th>
              <th className="pb-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {conversations.map((c) => {
              const isEmployee = !!(c.is_employee || c.user_is_employee);
              const when =
                c.last_at ||
                c.updated_at ||
                c.created_at ||
                c.date ||
                null;

              return (
                <tr key={c.session_id} className="border-t">
                  <td className="py-2">
                    <div className="font-semibold flex items-center gap-2">
                      <span>{c.user_name || "Sem nome"}</span>
                      {isEmployee && (
                        <span className="text-amber-800 text-xs bg-amber-100 border border-amber-300 rounded px-2 py-0.5">
                          Colaborador
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {c.user_phone}
                    </div>
                  </td>
                  <td className="py-2 whitespace-nowrap">{fmtDate(when)}</td>
                  <td className="py-2 text-center whitespace-nowrap">#{c.session_id}</td>
                  <td className="py-2 truncate max-w-[280px]">{c.last_message || "-"}</td>
                  <td className="py-2 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        c.status === "Finalizada"
                          ? "bg-gray-100 text-gray-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {c.status || "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {conversations.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">
                  Nenhuma conversa encontrada no período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
