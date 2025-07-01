import React, { useState } from "react";
import DateFilters from "../components/DateFilters";

const API_URL = import.meta.env.VITE_API_URL;

export default function ReportsPage() {
  const [filters, setFilters] = useState({ start: "", end: "" });

  function exportCsv() {
    if (!filters.start || !filters.end) {
      alert("Selecione as datas!");
      return;
    }
    const url = `${API_URL}/admin/export/messages?start_date=${filters.start}&end_date=${filters.end}`;
    window.open(url, "_blank");
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Exportação de Mensagens</h2>
      <DateFilters onApply={setFilters} />
      <button
        className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-purple-700 transition"
        onClick={exportCsv}
      >
        Exportar CSV
      </button>
    </div>
  );
}
