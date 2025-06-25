import React, { useEffect, useState } from "react";

export default function FeedbacksPage({ filters }) {
  const [feedbacks, setFeedbacks] = useState([]);

  useEffect(() => {
    if (filters.start && filters.end) {
      fetch(`http://localhost:8000/admin/feedbacks?start_date=${filters.start}&end_date=${filters.end}`)
        .then(res => res.json())
        .then(data => setFeedbacks(data.feedbacks || []));
    }
  }, [filters]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Feedbacks</h2>
      <table className="w-full bg-white rounded-xl shadow text-sm">
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
