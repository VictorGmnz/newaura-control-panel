import React, { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import ConversationMetricsChart from "../components/ConversationMetricsChart";
import MessagesPerConversationChart from "../components/MessagesPerConversationChart";
import LastConversationsTable from "../components/LastConversationsTable";
import DateFilters from "../components/DateFilters";
import { getDefaultFilters } from "../utils/dateUtils";
import { authFetch } from "../utils/authFetch";
import { useAuth } from "../utils/authData";
import UsageLimits from "../components/UsageLimits";

function TabButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "px-3 py-2 text-sm rounded-t-md border-b-2 -mb-px " +
        (active
          ? "border-primary text-primary font-semibold"
          : "border-transparent text-gray-500 hover:text-gray-700")
      }
    >
      {label}
    </button>
  );
}

export default function Dashboard({ filters: filtersProp }) {
  const [filters, setFilters] = useState(() =>
    filtersProp && filtersProp.start && filtersProp.end ? filtersProp : getDefaultFilters()
  );

  const [summary, setSummary] = useState(null);
  const [series, setSeries] = useState([]);
  const [byConversation, setByConversation] = useState([]);
  const [lastConversations, setLastConversations] = useState([]);
  const [usage, setUsage] = useState(null);
  const [authors, setAuthors] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("last");
  const API_URL = import.meta.env.VITE_API_URL;

  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const COMPANY_ID = user.company_id;

  function fetchAll() {
    setLoading(true);
    setError("");

    const qs = `start_date=${filters.start}&end_date=${filters.end}&company_id=${COMPANY_ID}`;

    Promise.all([
      authFetch(`${API_URL}/dashboard/summary?company_id=${COMPANY_ID}`).then((r) => r.json()),
      authFetch(`${API_URL}/dashboard/conversations/overview?${qs}`).then((r) => r.json()),
      authFetch(`${API_URL}/dashboard/messages/by_conversation?${qs}`).then((r) => r.json()),
      authFetch(`${API_URL}/dashboard/last_conversations?${qs}`).then((r) => r.json()),
      authFetch(`${API_URL}/usage/interactions/summary?${qs}`).then((r) => r.json()),
      authFetch(`${API_URL}/dashboard/messages/author_mix?${qs}`).then((r) => r.json()),
    ])
      .then(([sum, seriesData, perConv, lastConv, usageData, authorData]) => {
        setSummary(sum || null);
        setSeries(Array.isArray(seriesData?.series) ? seriesData.series : []);
        setByConversation(Array.isArray(perConv?.items) ? perConv.items : []);
        setLastConversations(Array.isArray(lastConv) ? lastConv : []);
        setUsage(usageData || null);
        setAuthors(authorData || null);
      })
      .catch(() => setError("Erro ao carregar informações da dashboard."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchAll();
  }, [filters.start, filters.end]);

  const cards = useMemo(() => {
    console.log(summary)
    const totalInteractions =
      Number(summary?.total_interactions ?? summary?.total_messages ?? 0);

    const uniqueContacts =
      Number(summary?.unique_contacts ?? summary?.total_customers ?? 0);

    const totalConversationsFromSeries = Array.isArray(series)
      ? series.reduce(
          (acc, d) =>
            acc +
            Number(
              d.conversations ??
                d.total_conversations ??
                0
            ),
          0
        )
      : 0;

    const totalConversations = Number(
      summary?.total_conversations ?? totalConversationsFromSeries
    );

    const feedbackTotal = Number(summary?.total_feedbacks ?? 0);
    const feedbackPct = Number(summary?.positive_feedback_percent ?? 0);

    const ipc = totalConversations > 0 ? totalInteractions / totalConversations : 0;

    return [
      { label: "Conversas totais", value: totalConversations },
      { label: "Interações totais", value: totalInteractions },
      { label: "Média de Interações por Conversa", value: ipc.toFixed(1) },
      { label: "Contatos totais", value: uniqueContacts },
      { label: "Feedbacks totais ", value: feedbackTotal },
      { label: "Feedbacks Positivos totais (%) ", value: feedbackPct.toFixed(2) },
    ];
  }, [summary, series]);

  if (loading) {
    return (
      <div className="p-6">
        <DateFilters value={filters} onApply={setFilters} includePhone={false} />
        <div className="mt-4">Carregando…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6">
        <DateFilters value={filters} onApply={setFilters} includePhone={false} />
        <div className="mt-4 text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 my-4">
        {cards.map((c, i) => (
          <div key={i} className="bg-white shadow rounded-xl p-4 text-center">
            <div className="text-2xl font-extrabold text-primary">{c.value}</div>
            <div className="text-sm text-gray-500">{c.label}</div>
          </div>
        ))}
      </div>

      <DateFilters value={filters} onApply={setFilters} includePhone={false} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <ConversationMetricsChart data={series} />
        </div>
        <div className="lg:col-span-1">
          <UsageLimits usage={usage} authors={authors} range={filters} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white shadow rounded-xl p-0">
          <div className="flex items-center gap-2 border-b px-4 pt-3">
            <TabButton label="Últimas conversas" active={tab === "last"} onClick={() => setTab("last")} />
            <TabButton label="Mensagens por conversa" active={tab === "perconv"} onClick={() => setTab("perconv")} />
          </div>
          <div className="p-4">
            {tab === "last" && (
              <LastConversationsTable conversations={lastConversations} />
            )}
            {tab === "perconv" && (
              <MessagesPerConversationChart items={byConversation} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
