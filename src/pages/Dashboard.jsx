import React, { useState, useEffect } from "react";
import MetricsCards from "../components/MetricsCards";

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    activeConversations: 0,
    newContacts: 0,
    avgResponseTime: 0,
    feedbackRating: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch("http://localhost:8000/admin/summary")
      .then(res => {
        if (!res.ok) throw new Error("Erro ao buscar dados da API");
        return res.json();
      })
      .then(data => {
        setMetrics({
          activeConversations: data.total_messages,
          newContacts: data.total_customers,
          avgResponseTime: data.avg_response_time ?? 0,
          feedbackRating: data.positive_feedback_percent
        });
        setError("");
      })
      .catch(err => {
        setError("Não foi possível carregar as informações do servidor. Por favor contate o Suporte Técnico - Error 304.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-6">Carregando informações...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  return (
    <div>
      <MetricsCards metrics={metrics} />
      {/* outros componentes */}
    </div>
  );
}
