import React, { useEffect, useState } from "react";
import { getDefaultFilters } from "../utils/dateUtils";
import { authFetch } from "../utils/authFetch";

const API_URL = import.meta.env.VITE_API_URL;

export default function FeedbacksPage({ filters: filtersProp }) {
  const [filters, setFilters] = useState(() => filtersProp && filtersProp.start && filtersProp.end ? filtersProp : getDefaultFilters());
  const [feedbacks, setFeedbacks] = useState([]);

  useEffect(() => {
    if (filters.start && filters.end) {
      authFetch(`${API_URL}/admin/feedbacks?start_date=${filters.start}&end_date=${filters.end}`)
        .then(res => res.json())
        .then(data => setFeedbacks(data.feedbacks || []));
    }
  }, [filters]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Feedbacks</h2>
      <table className="text-center w-full bg-white rounded-xl shadow text-sm">
        <thead>
          <tr>
            <th>Telefone</th>
            <th>Feedback</th>
            <th>Enviado em</th>
            <th>Respondido em</th>
          </tr>
        </thead>
        <tbody>
          {feedbacks.map((f, i) => (
            <tr key={i} className="border-t">
              <td>{f.user_phone}</td>
              <td>{f.feedback}</td>
              <td>{f.sent_at}</td>
              <td>{f.response_time ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
