import React, { useMemo, useState } from "react";

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

function pickDate(it) {
  return it.last_at || null;
}

export default function MessagesPerConversationChart({ items = [] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("session_desc");

  const filtered = useMemo(() => {
    const txt = q.trim().toLowerCase();
    if (!txt) return items;
    return items.filter((it) => {
      const hay = `${it.user_name || ""} ${it.user_phone || ""} ${it.session_id || ""}`.toLowerCase();
      return hay.includes(txt);
    });
  }, [items, q]);

  const normalized = useMemo(
    () =>
      filtered.map((it) => ({
        ...it,
        value: Number(it.messages ?? it.total_messages ?? 0),
        sid: Number(it.session_id ?? 0),
        name: it.user_name || "",
        when: pickDate(it),
      })),
    [filtered]
  );

  const sorted = useMemo(() => {
    const arr = [...normalized];
    switch (sort) {
      case "session_desc":
        arr.sort((a, b) => b.sid - a.sid || b.value - a.value);
        break;
      case "session_asc":
        arr.sort((a, b) => a.sid - b.sid || b.value - a.value);
        break;
      case "name_az":
        arr.sort((a, b) => a.name.localeCompare(b.name) || b.value - a.value || b.sid - a.sid);
        break;
      case "messages_desc":
      default:
        arr.sort((a, b) => b.value - a.value || b.sid - a.sid);
        break;
    }
    return arr;
  }, [normalized, sort]);

  const maxVal = Math.max(1, ...sorted.map((it) => it.value));

  const selectId = "mpc-sort";
  const inputId = "mpc-filter";

  return (
    <div className="bg-white shadow rounded-xl p-4 h-full">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="font-bold text-lg">Mensagens por Conversa</h3>
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor={selectId} className="text-sm text-gray-600">
            Ordenar por:
          </label>
          <select
            id={selectId}
            className="border rounded px-2 py-1 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            title="Ordena a lista conforme o critério selecionado"
          >
            <option value="session_desc">Sessão (Mais recente)</option>
            <option value="session_asc">Sessão (Mais antiga)</option>
            <option value="messages_desc">Mensagens (Maior quantidade)</option>
            <option value="name_az">Nome (Ordem alfabética)</option>
          </select>

          <label htmlFor={inputId} className="text-sm text-gray-600">
            Filtrar por:
          </label>
          <input
            id={inputId}
            className="border rounded px-3 py-1 text-sm"
            placeholder="Nome / telefone"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            title="Filtra por nome ou telefone "
          />
        </div>
      </div>

      <div className="overflow-auto max-h-[360px] pr-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="pb-2">Contato</th>
              <th className="pb-2 whitespace-nowrap">Data</th>
              <th className="pb-2 text-center">Sessão</th>
              <th className="pb-2">Mensagens</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((it) => {
              const pct = Math.round((it.value / maxVal) * 100);
              const isEmployee = !!it.is_employee;

              return (
                <tr key={it.session_id} className="border-t">
                  <td className="py-2">
                    <div className="font-semibold flex items-center gap-2">
                      <span>{it.user_name || "Sem nome"}</span>
                      {isEmployee && (
                        <span className="text-amber-800 text-xs bg-amber-100 border border-amber-300 rounded px-2 py-0.5">
                          Colaborador
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{it.user_phone}</div>
                  </td>

                  <td className="py-2 whitespace-nowrap">{fmtDate(it.when)}</td>

                  <td className="py-2 text-center">#{it.session_id}</td>

                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-3 bg-gray-100 rounded w-full">
                        <div
                          className="h-3 rounded bg-primary"
                          style={{ width: `${pct}%` }}
                          title={`${it.value} mensagens`}
                        />
                      </div>
                      <div className="w-10 text-right font-semibold">{it.value}</div>
                    </div>
                  </td>
                </tr>
              );
            })}

            {sorted.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500">
                  Nenhuma conversa encontrada para o filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
