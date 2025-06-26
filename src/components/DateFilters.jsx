import React, { useState } from "react";

export default function DateFilters({ onApply, initialStart, initialEnd }) {
  const [start, setStart] = useState(initialStart || "");
  const [end, setEnd] = useState(initialEnd || "");

  function handleSubmit(e) {
    e.preventDefault();
    onApply({ start, end });
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-4 mb-4">
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
      <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-purple-700 transition self-end">
        Aplicar
      </button>
    </form>
  );
}
