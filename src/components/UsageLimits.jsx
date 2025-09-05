import React, { useMemo } from "react";

export default function UsageLimits({ usage, authors, range }) {
  const safe = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  const uLimit = safe(usage?.limit);
  const uUsed = safe(usage?.used);
  const uRem = Math.max(0, uLimit - uUsed);

  const botTotal = safe(authors?.bot);
  const human = safe(authors?.human);
  const faq = safe(authors?.faq);
  const totalMsg = botTotal + human + faq;

  const usageRatio = uLimit > 0 ? uUsed / uLimit : 0;
  const usageAngle = usageRatio * 360;

  const usageColor =
    usageRatio >= 0.9 ? "#ef4444" : usageRatio >= 0.7 ? "#f59e0b" : "#5A2EBB";

  const botAngle = totalMsg > 0 ? (botTotal / totalMsg) * 360 : 0;
  const humanAngle = totalMsg > 0 ? (human / totalMsg) * 360 : 0;

  const pct = (num, den) => (den > 0 ? Math.round((num / den) * 100) : 0);

  const cards = useMemo(
    () => [
      { label: "Limite de Interações", value: uLimit },
      { label: "Interações até o Momento", value: uUsed },
      { label: "Interações Restantes", value: uRem },
    ],
    [uLimit, uUsed, uRem]
  );

  const monthNames = useMemo(
    () => [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ],
    []
  );

  const currentMonth = useMemo(() => {
    const now = new Date();
    return monthNames[now.getMonth()];
  }, [monthNames]);

  const periodLabel = useMemo(() => {
    const pad = (n) => String(n).padStart(2, "0");
    const fmt = (s) => {
      if (!s) return "";
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) return "";
      const dd = pad(d.getDate());
      const mm = pad(d.getMonth() + 1);
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    };
    const start = fmt(range?.start);
    const end = fmt(range?.end);
    if (start && end) return `${start} — ${end}`;
    if (start) return `${start}`;
    if (end) return `${end}`;
    return "";
  }, [range?.start, range?.end]);

  return (
    <div className="bg-white shadow rounded-xl p-4 h-full flex flex-col gap-4">
      <h3 className="font-bold text-lg">Métricas da IA - {currentMonth}</h3>

      {/* Donut de consumo com cores por threshold */}
      <div className="flex items-center gap-4">
        <div
          className="w-28 h-28 rounded-full relative"
          style={{
            background: `conic-gradient(${usageColor} ${usageAngle}deg, #e5e7eb 0deg)`,
          }}
          title={`Interações: ${uUsed} / ${uLimit}`}
        >
          <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
            <span className="text-sm font-bold">{pct(uUsed, uLimit)}%</span>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-3 gap-2">
          {cards.map((c, i) => (
            <div key={i} className="border rounded-lg p-2 text-center">
              <div className="text-xl font-extrabold">{c.value}</div>
              <div className="text-xs text-gray-500">{c.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-gray-500" />

      {/* Donut de autores */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-baseline gap-2">
            <h4 className="font-bold text-lg">Métricas de respostas</h4>
          </div>
          <div className="flex gap-3 text-xs">
            <span className="inline-flex items-center gap-1">
              <i
                className="w-3 h-3 rounded-full inline-block"
                style={{ background: "#5A2EBB" }}
              />{" "}
              ChatBot ({botTotal})
            </span>
            <span className="inline-flex items-center gap-1">
              <i
                className="w-3 h-3 rounded-full inline-block"
                style={{ background: "#10b981" }}
              />{" "}
              Operador ({human})
            </span>
            <span className="inline-flex items-center gap-1">
              <i
                className="w-3 h-3 rounded-full inline-block"
                style={{ background: "#f59e0b" }}
              />{" "}
              FAQ ({faq})
            </span>
          </div>
        </div>
        <div className="flex justify-between mb-4">
          {periodLabel && (
            <span className="text-xs text-gray-600">Período: {periodLabel}</span>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div
            className="w-28 h-28 rounded-full relative"
            style={{
              background: `conic-gradient(#5A2EBB ${botAngle}deg, #10b981 ${botAngle}deg ${
                botAngle + humanAngle
              }deg, #f59e0b ${botAngle + humanAngle}deg)`,
            }}
            title={`ChatBot: ${botTotal} | Operador: ${human} | FAQ: ${faq}`}
          >
            <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
              <span className="text-sm font-bold">{totalMsg || 0}</span>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <div>
              Total de respostas no período: <strong>{totalMsg || 0}</strong>
            </div>
            <div>
              ChatBot: <strong>{pct(botTotal, totalMsg)}%</strong> · Operador:{" "}
              <strong>{pct(human, totalMsg)}%</strong> · FAQ:{" "}
              <strong>{pct(faq, totalMsg)}%</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
