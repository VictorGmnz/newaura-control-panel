import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function MessagesPerDayChart({ data }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow h-80">
      <h3 className="font-semibold mb-2 text-primary">Mensagens por Dia</h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" name="Mensagens" fill="#5A2EBB" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
