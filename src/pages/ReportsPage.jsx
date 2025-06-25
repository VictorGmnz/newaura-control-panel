import React, { useState } from "react";
import DateFilters from "../components/DateFilters";

export default function ReportsPage() {
  const [filters, setFilters] = useState({ start: "", end: "" });

  function exportCsv() {
    if (!filters.start || !filters.end) {
      alert("Selecione as datas!");
      return;
    }
    const url = `http://localhost:8000/admin/export/messages?start_date=${filters.start}&end_date=${filters.end}`;
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
