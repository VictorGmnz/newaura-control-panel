import React, { useMemo } from "react";

export default function UsageLimits({ usage }) {
  const safe = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  const uLimit = safe(usage?.limit);
  const uUsed  = safe(usage?.used);
  const uRem   = Math.max(0, uLimit - uUsed);

  const usageRatio = uLimit > 0 ? uUsed / uLimit : 0;
  const usageAngle = usageRatio * 360;
  const usageColor =
    usageRatio >= 0.9 ? "#ef4444" : usageRatio >= 0.7 ? "#f59e0b" : "#5A2EBB";
  const pct = (num, den) => (den > 0 ? Math.round((num / den) * 100) : 0);

  const cards = useMemo(
    () => [
      { label: "Limite de Interações", value: uLimit },
      { label: "Interações até o Momento", value: uUsed },
      { label: "Interações Restantes", value: uRem },
    ],
    [uLimit, uUsed, uRem]
  );

  const monthNames = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const currentMonth = monthNames[new Date().getMonth()];

  return (
    <div className="bg-white shadow rounded-xl p-4 h-full flex flex-col gap-6">
      <h3 className="font-bold text-lg mb-5">Métricas de Uso da IA - {currentMonth}</h3>
      <div className="flex items-center gap-4">
        <div
          className="w-36 h-36 rounded-full relative"
          style={{ 
            background: `conic-gradient(${usageColor} ${usageAngle}deg, #e5e7eb 0deg)`,
            filter: "drop-shadow(0 0 8px rgba(0,0,0,.50))" 
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
    </div>
  );
}
