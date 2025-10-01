import React, { useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

export default function UsageBreakdowns({ authors = {}, range }) {
  // seleção fixa (click) e destaque temporário (hover)
  const [selectedA, setSelectedA] = useState(null);
  const [selectedB, setSelectedB] = useState(null);
  const [hoverA, setHoverA] = useState(null);
  const [hoverB, setHoverB] = useState(null);

  const safe = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const pct  = (num, den) => (den > 0 ? Math.round((num / den) * 100) : 0);

  // período
  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (s) => {
    if (!s) return "";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "";
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  };
  const periodLabel = useMemo(() => {
    const start = fmt(range?.start);
    const end   = fmt(range?.end);
    if (start && end) return `${start} — ${end}`;
    if (start) return start;
    if (end)   return end;
    return "";
  }, [range?.start, range?.end]);

  // dados – autores
  const botTotal = safe(authors.bot);
  const human    = safe(authors.human);
  const faq      = safe(authors.faq);
  const totalMsg = botTotal + human + faq;

  const authorData =
    totalMsg > 0
      ? [
          { name: "ChatBot",  value: botTotal, color: "#5A2EBB" },
          { name: "Operador", value: human,    color: "#10b981" },
          { name: "FAQ",      value: faq,      color: "#54d3faff" },
        ]
      : [{ name: "Sem dados", value: 1, color: "#e5e7eb" }];

  // dados – audiência do bot
  const botLead     = safe(authors.bot_lead);
  const botClient   = safe(authors.bot_client);
  const botEmployee = safe(authors.bot_employee);
  const botSplitTotal = (botLead + botClient + botEmployee) || botTotal || 0;

  const audienceData =
    botSplitTotal > 0
      ? [
          { name: "Lead",        value: botLead,     color: "#3b82f6" },
          { name: "Cliente",     value: botClient,   color: "#c70021ff" },
          { name: "Colaborador", value: botEmployee, color: "#f59e0b" },
        ]
      : [{ name: "Sem dados", value: 1, color: "#e5e7eb" }];

  // tooltips
  const tooltipA = ({ active, payload }) =>
    !active || !payload?.length ? null : (
      <div className="bg-white/95 backdrop-blur px-2 py-1 rounded shadow text-xs">
        <div className="font-semibold">{payload[0].name}</div>
        <div>{payload[0].value} • {pct(payload[0].value, totalMsg)}%</div>
      </div>
    );
  const tooltipB = ({ active, payload }) =>
    !active || !payload?.length ? null : (
      <div className="bg-white/95 backdrop-blur px-2 py-1 rounded shadow text-xs">
        <div className="font-semibold">{payload[0].name}</div>
        <div>{payload[0].value} • {pct(payload[0].value, botSplitTotal)}%</div>
      </div>
    );

  // regra de opacidade: hover > seleccionado > normal
  const dim = (name, hoverName, selectedName) => {
    if (hoverName)    return hoverName    === name ? 1 : 0.3;
    if (selectedName) return selectedName === name ? 1 : 0.3;
    return 1;
  };
  const glow = (active) =>
    active ? "drop-shadow(0 0 8px rgba(0, 0, 0, 1.0))" : "drop-shadow(0 0 8px rgba(0,0,0,.60))";

  const LegendDot = ({ color }) => (
    <i className="w-3 h-3 rounded-full inline-block" style={{ background: color }} />
  );

  const LegendItem = ({ color, text, name, hoverSetter, selectSetter, isA }) => (
    <span
      className="inline-flex items-center gap-1 cursor-pointer select-none"
      onMouseEnter={() => hoverSetter(name)}
      onMouseLeave={() => hoverSetter(null)}
      onClick={() => selectSetter((prev) => (prev === name ? null : name))}
      title="Clique para fixar destaque"
    >
      <LegendDot color={color} /> {text}
    </span>
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-[100%]">
      {/* CARD 1 */}
      <div className="bg-white shadow rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-bold text-lg">Métricas de respostas</h4>
          <div className="flex gap-3 text-xs">
            <LegendItem color="#5A2EBB" text={`ChatBot (${botTotal})`} name="ChatBot"  hoverSetter={setHoverA} selectSetter={setSelectedA} />
            <LegendItem color="#10b981" text={`Operador (${human})`}  name="Operador" hoverSetter={setHoverA} selectSetter={setSelectedA} />
            <LegendItem color="#54d3faff" text={`FAQ (${faq})`}       name="FAQ"      hoverSetter={setHoverA} selectSetter={setSelectedA} />
          </div>
        </div>
        {periodLabel && <div className="text-xs text-gray-600 mb-3">Período: {periodLabel}</div>}

        <div className="flex items-center gap-6">
          <div className="relative w-40 h-40">
            <ResponsiveContainer width="110%" height="110%">
              <PieChart>
                <Tooltip content={tooltipA} />
                <Pie
                  data={authorData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={72}
                  stroke="#ffffffff"
                  strokeWidth={1.5}
                  paddingAngle={1}
                  isAnimationActive={false}
                >
                  {authorData.map((seg, i) => {
                    const isActive =
                      (hoverA && hoverA === seg.name) ||
                      (!hoverA && selectedA && selectedA === seg.name);
                    return (
                      <Cell
                        key={i}
                        fill={seg.color}
                        opacity={dim(seg.name, hoverA, selectedA)}
                        style={{
                          cursor: seg.name !== "Sem dados" ? "pointer" : "default",
                          filter: glow(isActive),
                          transition: "opacity .15s ease"
                        }}
                        onMouseEnter={() => setHoverA(seg.name)}
                        onMouseLeave={() => setHoverA(null)}
                      />
                    );
                  })}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="text-sm text-gray-600">
            <div>• Total de respostas enviadas no período: <strong>{totalMsg || 0}</strong></div>
            <div>
              • ChatBot: <strong>{pct(botTotal, totalMsg)}%</strong> · Operador: <strong>{pct(human, totalMsg)}%</strong> · FAQ: <strong>{pct(faq, totalMsg)}%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 2 */}
      <div className="bg-white shadow rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-bold text-lg">Métricas de contatos</h4>
          <div className="flex gap-3 text-xs">
            <LegendItem color="#3b82f6"   text={`Lead (${botLead})`}            name="Lead"        hoverSetter={setHoverB} selectSetter={setSelectedB} />
            <LegendItem color="#c70021ff" text={`Cliente (${botClient})`}       name="Cliente"     hoverSetter={setHoverB} selectSetter={setSelectedB} />
            <LegendItem color="#f59e0b"   text={`Colaborador (${botEmployee})`} name="Colaborador" hoverSetter={setHoverB} selectSetter={setSelectedB} />
          </div>
        </div>
        {periodLabel && <div className="text-xs text-gray-600 mb-3">Período: {periodLabel}</div>}

        <div className="flex items-center gap-6">
          <div className="relative w-40 h-40">
            <ResponsiveContainer width="110%" height="110%">
              <PieChart>
                <Tooltip content={tooltipB} />
                <Pie
                  data={audienceData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={72}
                  stroke="#ffffffff"
                  strokeWidth={1.5}
                  filter="drop-shadow(0 0 8px rgba(0,0,0,.20))"
                  paddingAngle={1}
                  isAnimationActive={false}
                >
                  {audienceData.map((seg, i) => {
                    const isActive =
                      (hoverB && hoverB === seg.name) ||
                      (!hoverB && selectedB && selectedB === seg.name);
                    return (
                      <Cell
                        key={i}
                        fill={seg.color}
                        opacity={dim(seg.name, hoverB, selectedB)}
                        style={{
                          cursor: seg.name !== "Sem dados" ? "pointer" : "default",
                          filter: glow(isActive),
                          transition: "opacity .15s ease"
                        }}
                        onMouseEnter={() => setHoverB(seg.name)}
                        onMouseLeave={() => setHoverB(null)}
                      />
                    );
                  })}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="text-sm text-gray-600">
            <div>• Total de mensagens recebidas no período: <strong>{botTotal || 0}</strong></div>
            <div>
              • Lead: <strong>{pct(botLead, botSplitTotal)}%</strong> · Cliente: <strong>{pct(botClient, botSplitTotal)}%</strong> · Colaborador: <strong>{pct(botEmployee, botSplitTotal)}%</strong>
            </div>
            <div className="text-xs text-gray-500">{botSplitTotal === 0 && "Sem respostas do ChatBot no período."}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
