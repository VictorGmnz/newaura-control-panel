import React from "react";

export default function MetricsCards({ metrics }) {
  const cards = [
    {
      label: "Conversas Ativas",
      value: metrics.activeConversations,
      color: "bg-primary text-white"
    },
    {
      label: "Novos Contatos",
      value: metrics.newContacts,
      color: "bg-white text-primary border border-primary"
    },
    {
      label: "Tempo Médio Resposta (min)",
      value: metrics.avgResponseTime,
      color: "bg-white text-primary border border-primary"
    },
    {
      label: "Avaliação Feedback (%)",
      value: metrics.feedbackRating,
      color: "bg-white text-primary border border-primary"
    }
  ];

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`rounded-xl shadow ${c.color} px-4 py-6 flex flex-col items-center justify-center`}
        >
          <span className="text-2xl font-bold">{c.value}</span>
          <span className="text-xs mt-2 text-center">{c.label}</span>
        </div>
      ))}
    </section>
  );
}
