// DateFilters.jsx
import React, { useState } from "react";

export default function DateFilters({ onApply, initialStart, initialEnd, initialPhone }) {
  const [start, setStart] = useState(initialStart || "");
  const [end, setEnd] = useState(initialEnd || "");
  const [phone, setPhone] = useState(initialPhone || "");

  function handleSubmit(e) {
    e.preventDefault();
    onApply({ start, end, phone });
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-4 mb-4 flex-wrap">
      <div>
        <label className="block text-xs mb-1">De:</label>
        <input
          type="date"
          value={start}
          onChange={e => setStart(e.target.value)}
          className="border rounded px-2 py-1"
        />
      </div>
      <div>
        <label className="block text-xs mb-1">Até:</label>
        <input
          type="date"
          value={end}
          onChange={e => setEnd(e.target.value)}
          className="border rounded px-2 py-1"
        />
      </div>
      <div>
        <label className="block text-xs mb-1">Telefone:</label>
        <input
          type="text"
          placeholder="DDD + Número "
          value={phone}
          onChange={e => setPhone(e.target.value)}
          className="border rounded px-2 py-1"
        />
      </div>
      <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-purple-700 transition self-end">
        Aplicar
      </button>
    </form>
  );
}
