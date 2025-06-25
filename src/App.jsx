import React from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import MetricsCards from "./components/MetricsCards";
import ConversationMetricsChart from "./components/ConversationMetricsChart";
import MessagesPerDayChart from "./components/MessagesPerDayChart";
import LastConversationsTable from "./components/LastConversationsTable";
import DateFilters from "./components/DateFilters";
import {
  metrics,
  conversationMetrics,
  messagesPerDay,
  lastConversations
} from "./data/mockData";
import { useState } from "react";

export default function App() {
  // Estados de filtro de datas
  const [filters, setFilters] = useState({});

  // Aqui você pode implementar lógica para filtrar dados de acordo com "filters"
  // No mock não filtramos, mas pode aplicar depois ao conectar com backend

  return (
    <div>
      <Sidebar />
      <div className="md:ml-56 ml-20 pt-20 px-4 md:px-8 pb-8 bg-gray-100 min-h-screen">
        <Header />
        <main className="pt-8">
          <DateFilters onApply={setFilters} />
          <MetricsCards metrics={metrics} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <ConversationMetricsChart data={conversationMetrics} />
            <MessagesPerDayChart data={messagesPerDay} />
          </div>
          <LastConversationsTable conversations={lastConversations} />
        </main>
      </div>
    </div>
  );
}
