import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../utils/authData";
import { authFetch } from "../utils/authFetch";
import DateFilters from "../components/DateFilters";
import { Link } from "react-router-dom";
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";

function fmtDuration(sec) {
  if (sec == null || !Number.isFinite(Number(sec))) return "—";
  const s = Math.max(0, Math.trunc(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(r).padStart(2, "0")}s`;
  if (m > 0) return `${m}m ${String(r).padStart(2, "0")}s`;
  return `${r}s`;
}

function fmtDate(v) {
  if (!v) return "-";
  const d = new Date(v.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return "-";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const norm = (s) =>
  (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export default function Feedbacks() {
  const { user } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL;

  const [filters, setFilters] = useState(() => {
    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    const startDt = new Date(now);
    startDt.setMonth(startDt.getMonth() - 1);
    const start = startDt.toISOString().slice(0, 10);
    return { start, end, phone: "" };
  });

  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");

  const [sortBy, setSortBy] = useState("sent_at"); // sent_at | frt_seconds | user_name | session_id | feedback
  const [sortDir, setSortDir] = useState("desc");  // asc | desc

  const [loading, setLoading] = useState(false);

  function load() {
    setLoading(true);
    const qs = new URLSearchParams({
      company_id: String(user.company_id),
      start_date: filters.start,
      end_date: filters.end,
    });
    if (filters.phone) qs.set("phone", filters.phone);

    authFetch(`${API_URL}/admin/feedbacks?${qs.toString()}`)
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data.feedbacks) ? data.feedbacks : []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!user?.company_id) return;
    load();
  }, [user?.company_id, filters.start, filters.end, filters.phone]);

  function headerSort(col) {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
  }

  function SortIcon({ col }) {
    const base = "inline-block ml-1";
    if (sortBy !== col) return <FaSort className={`${base} text-gray-300`} aria-hidden="true" />;
    return sortDir === "asc"
      ? <FaSortUp className={`${base} text-primary`} aria-hidden="true" />
      : <FaSortDown className={`${base} text-primary`} aria-hidden="true" />;
  }

  // rank semântico para ordenar feedback: Otimo(0) < Regular(1) < Ruim(2) < Sem resposta(3)
  function feedbackRank(feedback, responded) {
    const k = norm(feedback);
    if (!responded || !k || k === "—" || k === "-") return 3;
    if (k === "otimo" || k === "ótimo") return 0;
    if (k === "regular") return 1;
    if (k === "ruim") return 2;
    return 3;
  }

  const filtered = useMemo(() => {
    let arr = [...items];

    const txt = q.trim().toLowerCase();
    if (txt) {
      arr = arr.filter((it) => {
        const hay = `${it.user_name || ""} ${it.user_phone || ""} ${it.session_id || ""}`.toLowerCase();
        return hay.includes(txt);
      });
    }

    const dirFactor = sortDir === "asc" ? 1 : -1;

    function getVal(it) {
      switch (sortBy) {
        case "user_name":
          return (it.user_name || "").toString().toLowerCase();
        case "feedback":
          return feedbackRank(it.feedback, it.responded);
        case "session_id":
          return Number(it.session_id || 0);
        case "frt_seconds": {
          if (it.responded && Number.isFinite(Number(it.frt_seconds))) {
            return Number(it.frt_seconds);
          }
          return sortDir === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
        }
        case "sent_at":
        default:
          return new Date(it.sent_at || 0).getTime();
      }
    }

    arr.sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);

      if (va < vb) return -1 * dirFactor;
      if (va > vb) return 1 * dirFactor;

      // desempate por data de envio (mais recente primeiro)
      const ta = new Date(a.sent_at || 0).getTime();
      const tb = new Date(b.sent_at || 0).getTime();
      if (ta === tb) return 0;
      return tb - ta;
    });

    return arr;
  }, [items, q, sortBy, sortDir]);

  function ariaSort(col) {
    if (sortBy !== col) return "none";
    return sortDir === "asc" ? "ascending" : "descending";
  }

  function feedbackBadgeClass(v) {
    const k = norm(v);
    if (k === "otimo" || k === "ótimo") return "bg-green-100 text-green-700 border-green-300";
    if (k === "regular") return "bg-amber-100 text-amber-800 border-amber-300";
    if (k === "ruim") return "bg-red-100 text-red-700 border-red-300";
    return "bg-gray-100 text-gray-700 border-gray-300";
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-2xl font-bold">Feedbacks</h2>
      </div>

      <DateFilters
        value={{ start: filters.start, end: filters.end, phone: filters.phone }}
        onApply={(v) => setFilters({ start: v.start, end: v.end, phone: v.phone || "" })}
      />
      <input
        className="border rounded w-[210px] px-4 py-2 text-sm mb-4"
        placeholder="Filtrar por nome ou telefone"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="bg-white shadow rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="p-3">
                <button
                  className="flex items-center font-medium"
                  onClick={() => headerSort("user_name")}
                  aria-sort={ariaSort("user_name")}
                >
                  Contato <SortIcon col="user_name" />
                </button>
              </th>
              <th className="p-3">
                <button
                  className="flex items-center font-medium"
                  onClick={() => headerSort("feedback")}
                  aria-sort={ariaSort("feedback")}
                >
                  Avaliação <SortIcon col="feedback" />
                </button>
              </th>
              <th className="p-3">
                <button
                  className="flex items-center font-medium"
                  onClick={() => headerSort("sent_at")}
                  aria-sort={ariaSort("sent_at")}
                >
                  Enviado em <SortIcon col="sent_at" />
                </button>
              </th>
              <th className="p-3">
                <button
                  className="flex items-center font-medium"
                  onClick={() => headerSort("frt_seconds")}
                  aria-sort={ariaSort("frt_seconds")}
                >
                  Tempo de Resposta <SortIcon col="frt_seconds" />
                </button>
              </th>
              <th className="p-3 text-center">
                <button
                  className="flex items-center font-medium mx-auto"
                  onClick={() => headerSort("session_id")}
                  aria-sort={ariaSort("session_id")}
                >
                  Sessão <SortIcon col="session_id" />
                </button>
              </th>
              <th className="p-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  Carregando…
                </td>
              </tr>
            )}

            {!loading &&
              filtered.map((it) => {
                const fbCls = feedbackBadgeClass(it.feedback);

                return (
                  <tr key={`${it.feedback_id}-${it.session_id || it.user_phone}`} className="border-t">
                    <td className="p-3">
                      <div className="font-semibold">
                        {it.user_name || "Sem nome"}{" "}
                        {it.is_employee && (
                          <span className="ml-1 text-xs bg-amber-100 text-amber-800 border border-amber-300 rounded px-2 py-0.5">
                            Colaborador
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{it.user_phone}</div>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border inline-block ${fbCls}`}>
                        {it.feedback ?? "—"}
                      </span>
                    </td>
                    <td className="p-3">{fmtDate(it.sent_at)}</td>
                    <td className="p-3">
                      {it.responded && it.frt_seconds != null ? fmtDuration(it.frt_seconds) : "Pendente"}
                    </td>
                    <td className="p-3 text-center">
                      {it.session_id ? (
                        <span className="text-gray-700">#{it.session_id}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <Link
                        to={`/conversas?phone=${encodeURIComponent(it.user_phone || "")}`}
                        className="inline-block bg-primary text-white px-3 py-1 rounded-lg shadow hover:bg-purple-700 transition"
                      >
                        Abrir conversa
                      </Link>
                    </td>
                  </tr>
                );
              })}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  Nenhum feedback encontrado no período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
