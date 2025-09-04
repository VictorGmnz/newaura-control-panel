import React, { useEffect, useState } from "react";

export default function DateFilters({ value, onApply, includePhone = true }) {
  const [start, setStart] = useState(value?.start || "");
  const [end, setEnd] = useState(value?.end || "");
  const [phone, setPhone] = useState(value?.phone || "");

  useEffect(() => {
    setStart(value?.start || "");
    setEnd(value?.end || "");
    setPhone(value?.phone || "");
  }, [value?.start, value?.end, value?.phone]);

  function handleSubmit(e) {
    e.preventDefault();
    const payload = includePhone ? { start, end, phone } : { start, end };
    onApply?.(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-4 mb-4 flex-wrap">
      <div>
        <label className="block text-xs mb-1">De:</label>
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="border rounded px-2 py-1"
        />
      </div>
      <div>
        <label className="block text-xs mb-1">Até:</label>
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="border rounded px-2 py-1"
        />
      </div>

      {includePhone && (
        <div>
          <label className="block text-xs mb-1">Telefone:</label>
          <input
            type="text"
            placeholder="DDD + Número "
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
      )}

      <button
        type="submit"
        className="bg-primary text-white px-2 py-2 rounded-lg shadow hover:bg-purple-700 transition self-end"
      >
        Aplicar
      </button>
    </form>
  );
}
