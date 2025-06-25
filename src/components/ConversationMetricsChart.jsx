import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function ConversationMetricsChart({ data }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow h-80">
      <h3 className="font-semibold mb-2 text-primary">Métricas de Conversas</h3>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="started" stroke="#5A2EBB" name="Iniciadas" strokeWidth={3} />
          <Line type="monotone" dataKey="finished" stroke="#32E875" name="Concluídas" strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
