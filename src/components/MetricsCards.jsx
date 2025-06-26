import React from "react";

export default function MetricsCards({ metrics }) {
  const cards = [
    {
      label: "Mensagens Totais",
      value: metrics.totalConversations,
      color: "bg-primary text-white"
    },
    {
      label: "Clientes totais",
      value: metrics.totalCustomer,
      color: "bg-white text-primary border border-primary"
    },
    {
      label: "Feedback Recebidos",
      value: metrics.totalFeedbacks,
      color: "bg-white text-primary border border-primary"
    },
    {
      label: "Avaliação Feedback Positivo (%)",
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
