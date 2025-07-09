import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import MetricsCards from "../components/MetricsCards";
import ConversationMetricsChart from "../components/ConversationMetricsChart";
import MessagesPerDayChart from "../components/MessagesPerDayChart";
import LastConversationsTable from "../components/LastConversationsTable";
import { getDefaultFilters } from "../utils/dateUtils";
import { authFetch } from "../utils/authFetch";
import { useAuth } from '../utils/authData';

export default function Dashboard({ filters: filtersProp }) {
  const [filters, setFilters] = useState(() => filtersProp && filtersProp.start && filtersProp.end ? filtersProp : getDefaultFilters());
  const [metrics, setMetrics] = useState({});
  const [convMetrics, setConvMetrics] = useState([]);
  const [messagesPerDay, setMessagesPerDay] = useState([]);
  const [lastConversations, setLastConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const API_URL = import.meta.env.VITE_API_URL;
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const COMPANY_ID = user? user.company_id: 0;

  useEffect(() => {
    if (!filters.start || !filters.end) {
      setFilters(getDefaultFilters());
    }
    setLoading(true);
    Promise.all([
      authFetch(`${API_URL}/admin/summary?company_id=${COMPANY_ID}`).then(res => res.json()),
      authFetch(`${API_URL}/admin/messages/metrics?start_date=${filters.start}&end_date=${filters.end}&company_id=${COMPANY_ID}`).then(res => res.json()),
      authFetch(`${API_URL}/admin/messages/per_day?start_date=${filters.start}&end_date=${filters.end}&company_id=${COMPANY_ID}`).then(res => res.json()),
      authFetch(`${API_URL}/admin/last_conversations?start_date=${filters.start}&end_date=${filters.end}&company_id=${COMPANY_ID}`).then(res => res.json())
    ])
      .then(([summary, metricsData, perDayData, lastConvData]) => {
        setMetrics({
          totalConversations: summary.total_messages,
          totalCustomer: summary.total_customers,
          totalFeedbacks: summary.total_feedbacks ?? 0,
          feedbackRating: summary.positive_feedback_percent
        });
        setConvMetrics(metricsData);
        setMessagesPerDay(perDayData);
        setLastConversations(lastConvData);
        setError("");
      })
      .catch(err => {
        setError("Erro ao carregar informações da dashboard.");
      })
      .finally(() => setLoading(false));
  }, [filters]);

  if (loading) return <div className="p-6">Carregando...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div>
      <MetricsCards metrics={metrics} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <ConversationMetricsChart data={convMetrics} />
        <MessagesPerDayChart data={messagesPerDay} />
      </div>
      <LastConversationsTable conversations={lastConversations} />
    </div>
  );
}
