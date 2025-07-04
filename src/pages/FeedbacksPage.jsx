import React, { useEffect, useState } from "react";
import DateFilters from "../components/DateFilters";
import { getDefaultFilters } from "../utils/dateUtils";
import { authFetch } from "../utils/authFetch";

const API_URL = import.meta.env.VITE_API_URL;

export default function FeedbacksPage({ filters: filtersProp }) {
    const [filters, setFilters] = useState(() =>
      filtersProp && filtersProp.start && filtersProp.end
        ? filtersProp
        : getDefaultFilters()
    );
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (filters.start && filters.end) {
      let url = `${API_URL}/admin/feedbacks?start_date=${filters.start}&end_date=${filters.end}`;
      if (filters.phone) url += `&phone=55${encodeURIComponent(filters.phone)}`;
      authFetch(url)
        .then(res => {
          if (!res.ok) throw new Error("Erro ao buscar feedbacks");
          return res.json();
        })
        .then(data => setFeedbacks(data.feedbacks || []))
        .catch(() => setError("Não foi possível carregar os feedbacks. Tente novamente mais tarde."))
        .finally(() => setLoading(false));
    }
  }, [filters]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Feedbacks</h2>
      <DateFilters
        initialStart={filters.start}
        initialEnd={filters.end}
        initialPhone={filters.phone}
        onApply={setFilters}
      />
      {loading ? (
        <div>Carregando mensagens...</div>
      ) : (
        <table className="w-full bg-white rounded-xl shadow text-sm overflow-hidden">
          <thead>
            <tr className="bg-[#5A2EBB] text-white">
              <th className="py-3 px-2 text-center font-bold border-r border-white">Telefone</th>
              <th className="py-3 px-2 text-center font-bold border-r border-white">Feedback</th>
              <th className="py-3 px-2 text-center font-bold border-r border-white">Enviado em</th>
              <th className="py-3 px-2 text-center font-bold">Respondido em</th>
            </tr>
          </thead>
          <tbody>
            {feedbacks.map((f, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                <td className="py-2 px-2 text-center font-mono border-r border-gray-200">{f.user_phone}</td>
                <td className="py-2 px-2 text-center border-r border-gray-200">
                  <span className={
                    f.feedback === "Ótimo"
                      ? "bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold"
                      : f.feedback === "Regular"
                      ? "bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-semibold"
                      : f.feedback === "Ruim"
                      ? "bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold"
                      : ""
                  }>
                    {f.feedback || "-"}
                  </span>
                </td>
                <td className="py-2 px-2 text-center border-r border-gray-200">{f.sent_at}</td>
                <td className="py-2 px-2 text-center">{f.response_time ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
