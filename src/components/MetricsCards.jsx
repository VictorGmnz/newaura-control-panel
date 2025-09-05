import React from "react";

export default function MetricsCards({ metrics }) {
  const items = Array.isArray(metrics)
    ? metrics
    : [
        { label: "Mensagens totais", value: metrics?.totalMessages ?? 0 },
        { label: "Contatos únicos", value: metrics?.uniqueContacts ?? 0 },
        { label: "Feedbacks recebidos", value: metrics?.totalFeedbacks ?? 0 },
        { label: "Feedback positivo (%)", value: metrics?.feedbackRating ?? 0 },
      ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-4">
      {items.map((c, i) => (
        <div key={i} className="bg-white shadow rounded-xl p-4 text-center">
          <div className="text-2xl font-extrabold text-primary">{c.value}</div>
          <div className="text-sm text-gray-500">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
