import React from "react";
import { useState } from "react";

export default function DateFilters({ onApply }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  return (
    <form
      className="flex gap-3 items-end mb-6"
      onSubmit={e => {
        e.preventDefault();
        onApply({ start, end });
      }}
    >
      <div className="flex flex-col">
        <label className="text-xs text-gray-500 mb-1">De:</label>
        <input
          type="date"
          className="border rounded px-2 py-1"
          value={start}
          onChange={e => setStart(e.target.value)}
        />
      </div>
      <div className="flex flex-col">
        <label className="text-xs text-gray-500 mb-1">Até:</label>
        <input
          type="date"
          className="border rounded px-2 py-1"
          value={end}
          onChange={e => setEnd(e.target.value)}
        />
      </div>
      <button
        type="submit"
        className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-purple-700 transition"
      >
        Aplicar
      </button>
    </form>
  );
}
