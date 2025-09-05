// ConversationMetricsChart.jsx
import React, { useMemo, useState } from "react";

export default function ConversationMetricsChart({ data = [] }) {
  const series = Array.isArray(data) ? data : [];

  const parsed = useMemo(() => {
    const fmt = (val) => {
      if (!val) return "";
      if (val.includes("-")) {
        const [y, m, d] = val.split("-");
        return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
      }
      return val;
    };
    return series.map((d) => ({
      dateRaw: d.date || "",
      date: fmt(d.date || ""),
      conversations: Number(d.conversations ?? d.total_conversations ?? 0),
      interactions: Number(d.interactions ?? d.total_interactions ?? 0),
    }));
  }, [series]);

  const totals = useMemo(() => {
    const convs = parsed.reduce((a, b) => a + b.conversations, 0);
    const inter = parsed.reduce((a, b) => a + b.interactions, 0);
    const days = Math.max(parsed.length, 1);
    const ipc = convs > 0 ? inter / convs : 0;
    const avgDay = inter / days;
    return {
      convs,
      inter,
      ipc: Number.isFinite(ipc) ? ipc.toFixed(1) : "0.0",
      avgDay: Number.isFinite(avgDay) ? avgDay.toFixed(1) : "0.0",
    };
  }, [parsed]);

  const [hover, setHover] = useState(null);

  const W = 720;
  const H = 260;
  const P = 32;
  const n = Math.max(parsed.length, 1);
  const step = (W - 2 * P) / n;

  const groupW = step * 0.7;
  const outerW = groupW;
  const innerW = groupW * 0.55;

  const maxY = Math.max(
    1,
    ...parsed.map((d) => d.interactions),
    ...parsed.map((d) => d.conversations)
  );

  const yScale = (v) => {
    const h = (v / maxY) * (H - 2 * P);
    return H - P - h;
  };

  const ticks = parsed.length <= 10 ? parsed.map((_, i) => i) : [0, parsed.length - 1];

  function handleMove(e) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const scaleX = rect.width / W;
    const scaleY = rect.height / H;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (rect.width - W * scale) / 2;
    const offsetY = (rect.height - H * scale) / 2;

    const xSvg = (px - offsetX) / scale;
    const ySvg = (py - offsetY) / scale;

    if (xSvg < P || xSvg > W - P || ySvg < P || ySvg > H - P) {
      setHover(null);
      return;
    }

    const raw = (xSvg - (P + step / 2)) / step;
    const i = Math.max(0, Math.min(parsed.length - 1, Math.round(raw)));
    const cx = P + i * step + step / 2;

    setHover({
      i,
      x: cx,
      y: Math.min(yScale(parsed[i].conversations), yScale(parsed[i].interactions)),
    });
  }

  function handleLeave() {
    setHover(null);
  }

  return (
    <div className="bg-white shadow rounded-xl p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg">Métricas de Conversas</h3>
        <div className="flex gap-3 text-sm">
          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
            Total de Conversas no Período: {totals.convs}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
            Total de Mensagens no Período: {totals.inter}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
            Média de Mensagens por Conversa: {totals.ipc}
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-[300px]"
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => (
          <line
            key={idx}
            x1={P}
            x2={W - P}
            y1={H - P - t * (H - 2 * P)}
            y2={H - P - t * (H - 2 * P)}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}

        {parsed.map((d, i) => {
          const cx = P + i * step + step / 2;
          const outerX = cx - outerW / 2;
          const innerX = cx - innerW / 2;

          const yOuter = yScale(d.interactions);
          const hOuter = H - P - yOuter;

          const yInner = yScale(d.conversations);
          const hInner = H - P - yInner;

          return (
            <g key={i}>
              <rect
                x={outerX}
                y={yOuter}
                width={outerW}
                height={Math.max(0, hOuter)}
                rx="0"
                fill="#10b981"
                opacity="0.85"
              />
              <rect
                x={innerX}
                y={yInner}
                width={innerW}
                height={Math.max(0, hInner)}
                rx="0"
                fill="#5A2EBB"
              />
            </g>
          );
        })}

        {ticks.map((i) => {
          const cx = P + i * step + step / 2;
          const lbl = parsed[i]?.date || "";
          return (
            <text
              key={i}
              x={cx}
              y={H - P + 16}
              textAnchor="middle"
              fontSize="10"
              fill="#6b7280"
            >
              {lbl}
            </text>
          );
        })}

        <line x1={P} x2={W - P} y1={H - P} y2={H - P} stroke="#e5e7eb" />

        {hover && parsed[hover.i] && (
          <line
            x1={hover.x}
            x2={hover.x}
            y1={P}
            y2={H - P}
            stroke="#9ca3af"
            strokeDasharray="4 4"
          />
        )}
      </svg>

      {hover && parsed[hover.i] && (
        <div
          className="text-xs bg-white border rounded shadow px-2 py-1"
          style={{
            position: "relative",
            marginLeft: `${((hover.x - P) / (W - 2 * P)) * 100}%`,
            transform: "translateX(-50%)",
            marginTop: "-12px",
            width: "max-content",
          }}
        >
          <div className="font-semibold">
            {parsed[hover.i].date || parsed[hover.i].dateRaw}
          </div>
          <div>Mensagens: {parsed[hover.i].interactions}</div>
          <div>Conversas: {parsed[hover.i].conversations}</div>
          <div>
            Média de Mensagens por Conversa:{" "}
            {parsed[hover.i].conversations > 0
              ? (parsed[hover.i].interactions / parsed[hover.i].conversations).toFixed(1)
              : "0.0"}
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded bg-[#10b981]" />
          <span>Mensagens por dia</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded bg-[#5A2EBB]" />
          <span>Conversas por dia</span>
        </div>
      </div>
    </div>
  );
}
