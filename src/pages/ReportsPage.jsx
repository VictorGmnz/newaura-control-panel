import React, { useEffect, useMemo, useState } from "react";
import DateFilters from "../components/DateFilters";
import { authFetch } from "../utils/authFetch";
import { useAuth } from "../utils/authData";
import { Navigate, Link } from "react-router-dom"; // ⟵ ADICIONEI Link

// libs para export
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const WEEKDAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/* =========================
   Helpers de data
========================= */
function fmtDateYMDLocal(d) {
  const tz = d.getTimezoneOffset() * 60000;
  const local = new Date(d.getTime() - tz);
  return local.toISOString().slice(0, 10);
}
function parseLocal(dateStr) {
  const [d, t] = (dateStr || "").split(" ");
  if (!d) return null;
  const [Y, M, D] = d.split("-").map(Number);
  if (!t) return new Date(Y, M - 1, D);
  const [h, m, s] = t.split(":").map(Number);
  return new Date(Y, M - 1, D, h || 0, m || 0, s || 0);
}
function startOfDay(dt) {
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}
function formatDateLabel(dateStr) {
  const d = parseLocal(dateStr);
  if (!d) return { label: "", dateText: "—", timeText: "" };
  const today = startOfDay(new Date());
  const day = startOfDay(d);
  const diffDays = Math.round((today.getTime() - day.getTime()) / 86400000);

  const dateText = d.toLocaleDateString("pt-BR");
  const timeText = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  let label = "";
  if (diffDays === 0) label = "Hoje";
  else if (diffDays === 1) label = "Ontem";
  else if (diffDays >= 2 && diffDays <= 6) label = WEEKDAYS_PT[d.getDay()];

  return { label, dateText, timeText };
}

/* =========================
   Sanitização p/ PDF
========================= */
function normalizeTextForPDF(s) {
  if (!s) return "—";
  const cleaned = s
    .normalize("NFC")
    .replace(/[\r\n]+/g, " ")
    .replace(/[\u0000-\u001F\u007F]/g, " ");
  let out = "";
  for (const ch of cleaned) {
    const cp = ch.codePointAt(0);
    if (cp >= 0x20 && cp <= 0xff) out += ch;
  }
  out = out.replace(/\s{2,}/g, " ").trim();
  return out.length ? out : "—";
}

/* ========================= UI ========================= */
function Badge({ children, className = "" }) {
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${className}`}>
      {children}
    </span>
  );
}

function SessionLegend() {
  return (
    <div
      className="flex items-center gap-2 text-xs text-white font-bold bg-primary rounded-sm border border-primary p-2"
      title="Cada conversa alterna a cor de fundo na listagem entre cinza e branco."
    >
      <div className="flex items-center gap-2 ">
        <span className="hidden sm:inline">As mensagens são agrupadas por conversas. Cada conversa está sendo intercalada entre as cores: </span>
        <span className="inline-block w-3.5 h-3.5 rounded-sm border border-white bg-gray-400" />
        <span className="hidden sm:inline"> e </span>
        <span className="inline-block w-3.5 h-3.5 rounded-sm border border-gray-400 bg-white" />
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [filters, setFilters] = useState({
    start: "",
    end: "",
    q_name: "",
    q_phone: "",
    author_msg: "",
    author_resp: "",
    operator_service: "",
    intent: "",
  });

  const sortBy = "created_at";
  const order = "desc";

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [applyKey, setApplyKey] = useState(0);

  // índice de contato por conversa
  const [convoIndex, setConvoIndex] = useState(new Map());

  // UI do export
  const [showExportBar, setShowExportBar] = useState(false);
  const [exportScope, setExportScope] = useState("page");
  const [exportFormat, setExportFormat] = useState("excel");
  const [exporting, setExporting] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const COMPANY_ID = user ? user.company_id : 0;

  /* ========================= Bootstrap: último mês ========================= */
  useEffect(() => {
    if (bootstrapped) return;
    const today = new Date();
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const start = fmtDateYMDLocal(oneMonthAgo);
    const end = fmtDateYMDLocal(today);
    setFilters((f) => ({ ...f, start, end }));
    setApplyKey((k) => k + 1);
    setBootstrapped(true);
  }, [bootstrapped]);

  function handleApplyFilters(newFilters) {
    if (newFilters.start && newFilters.end) {
      setFilters((prev) => ({ ...prev, start: newFilters.start, end: newFilters.end }));
      setMessage("Filtros aplicados!");
      setPage(1);
      setApplyKey((k) => k + 1);
      setTimeout(() => setMessage(""), 2000);
    } else {
      setMessage("Por favor selecione as duas datas!");
      setTimeout(() => setMessage(""), 2500);
    }
  }

  // monta query de filtros
  function buildSearchParams(base = {}) {
    const params = new URLSearchParams();
    params.set("start_date", filters.start);
    params.set("end_date", filters.end);
    params.set("company_id", String(COMPANY_ID));
    params.set("group_by", "none");
    params.set("paginate", "by_row");
    params.set("sort_by", sortBy);
    params.set("order", order);

    if (base.page) params.set("page", String(base.page));
    if (base.limit) params.set("limit", String(base.limit));

    if (filters.q_name) params.set("q_name", filters.q_name);
    if (filters.q_phone) params.set("q_phone", filters.q_phone.replace(/\D/g, ""));
    if (filters.author_msg) params.set("author_msg", filters.author_msg);
    if (filters.author_resp) params.set("author_resp", filters.author_resp);
    if (filters.operator_service) params.set("operator_service", filters.operator_service);
    if (filters.intent) params.set("intent", filters.intent);

    return params;
  }

  async function fetchRows() {
    if (!filters.start || !filters.end) return;
    setLoading(true);
    try {
      const params = buildSearchParams({ page, limit });
      const url = `${API_URL}/admin/reports/messages?${params.toString()}`;
      const res = await authFetch(url);
      const json = await res.json();

      if (json && json.mode === "rows") {
        setRows(Array.isArray(json.rows) ? json.rows : []);
        setTotalRows(json.total_rows ?? 0);
      } else {
        setRows([]);
        setTotalRows(0);
      }
    } catch (e) {
      console.error(e);
      setMessage("Erro ao buscar relatórios.");
      setTimeout(() => setMessage(""), 2500);
    } finally {
      setLoading(false);
    }
  }

  // índice para nome/telefone por conversa
  async function fetchConvoIndex() {
    try {
      if (!filters.start || !filters.end) return;
      const params = new URLSearchParams();
      params.set("start_date", filters.start);
      params.set("end_date", filters.end);
      params.set("company_id", String(COMPANY_ID));
      const url = `${API_URL}/dashboard/messages/by_conversation?${params.toString()}`;
      const res = await authFetch(url);
      const json = await res.json();
      const map = new Map();
      if (json?.items) {
        json.items.forEach((it) => {
          map.set(it.session_id, {
            name: it.user_name || undefined,
            phone: it.user_phone || undefined,
            isEmp: !!it.is_employee,
          });
        });
      }
      setConvoIndex(map);
    } catch (e) {
      console.warn("Falha ao carregar índice de conversas:", e);
    }
  }

  useEffect(() => {
    if (filters.start && filters.end) {
      fetchRows();
      fetchConvoIndex();
    }
  }, [applyKey, page, limit]);

  const totalPages = useMemo(() => {
    const total = totalRows || 0;
    return Math.max(1, Math.ceil(total / limit));
  }, [totalRows, limit]);

  /* ========================= Enriquecimento de linhas ========================= */
  const decorated = useMemo(() => {
    const sessionContact = new Map();
    const filled = new Array(rows.length);

    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i];
      const sid = r.session_id;

      const inherited =
        sessionContact.get(sid) || { name: undefined, phone: undefined, isEmp: undefined };
      const name = r.user_name || inherited.name || (convoIndex.get(sid)?.name ?? "—");
      const phone = r.user_phone || inherited.phone || (convoIndex.get(sid)?.phone ?? "—");

      let isEmp =
        inherited.isEmp ?? (convoIndex.has(sid) ? convoIndex.get(sid)?.isEmp : undefined);

      if (r.author === "Employee" || r.author === "FAQ_EMP") isEmp = true;
      if (r.author === "User" || r.author === "FAQ") isEmp = isEmp === true ? true : false;

      sessionContact.set(sid, {
        name: r.user_name || name,
        phone: r.user_phone || phone,
        isEmp,
      });

      filled[i] = {
        contactName: name,
        contactPhone: phone,
        isEmployeeContact: isEmp === true,
      };
    }

    let lastSession = null;
    let toggle = false;

    return rows.map((r, idx) => {
      const firstOfSession = r.session_id !== lastSession;
      if (firstOfSession) {
        toggle = !toggle;
        lastSession = r.session_id;
      }
      const isOperator = r.author === "Human";
      const isFaqLead = r.author === "FAQ";
      const isFaqEmployee = r.author === "FAQ_EMP";
      const hasBotResponse =
        (r.bot_response ?? r.response ?? null) && (r.author === "User" || r.author === "Employee");

      const derivedLegit =
        isOperator ? true : r.legitimate === true ? true : r.legitimate === false ? false : null;

      const isEmployeeContact = filled[idx].isEmployeeContact;
      const isLeadContact = !isEmployeeContact;

      return {
        ...r,
        _sessionBg: toggle ? "bg-gray-200" : "bg-white",
        _firstOfSession: firstOfSession,
        _isOperator: isOperator,
        _isFaqLead: isFaqLead,
        _isFaqEmployee: isFaqEmployee,
        _isBotResponder: !!hasBotResponse && !isOperator && !isFaqLead && !isFaqEmployee,
        _contactName: filled[idx].contactName,
        _contactPhone: filled[idx].contactPhone,
        _isEmployeeContact: isEmployeeContact,
        _isLeadContact: isLeadContact,
        _derivedLegit: derivedLegit,
      };
    });
  }, [rows, convoIndex]);

  /* ========================= EXPORT – capacidades ========================= */
  function computeExportCapabilities(scope) {
    if (scope === "page") {
      return { allowPDF: true, allowExcel: true, allowCSV: false, reason: "" };
    }
    if (totalPages <= 40) {
      return { allowPDF: true, allowExcel: true, allowCSV: false, reason: "" };
    }
    if (totalPages <= 120) {
      return {
        allowPDF: false,
        allowExcel: true,
        allowCSV: false,
        reason:
          "O conteúdo é muito grande para processar um arquivo PDF — por favor tente exportar um arquivo Excel.",
      };
    }
    return {
      allowPDF: false,
      allowExcel: false,
      allowCSV: true,
      reason:
        "O conteúdo é muito grande para processar arquivos PDF e Excel. CSV é o único formato confiável para dados em massa.",
    };
  }

  function toggleExportBar() {
    setShowExportBar((prev) => {
      const next = !prev;
      if (next) {
        const scopeDefault = totalPages > 1 ? "page" : "page";
        setExportScope(scopeDefault);
        const caps = computeExportCapabilities(scopeDefault);
        if (caps.allowExcel) setExportFormat("excel");
        else if (caps.allowPDF) setExportFormat("pdf");
        else setExportFormat("csv");
      }
      return next;
    });
  }

  function onChangeScope(nextScope) {
    setExportScope(nextScope);
    const caps = computeExportCapabilities(nextScope);
    if (!caps.allowExcel && exportFormat === "excel") {
      if (caps.allowPDF) setExportFormat("pdf");
      else setExportFormat("csv");
    }
    if (!caps.allowPDF && exportFormat === "pdf") {
      if (caps.allowExcel) setExportFormat("excel");
      else setExportFormat("csv");
    }
    if (!caps.allowCSV && exportFormat === "csv") {
      if (caps.allowExcel) setExportFormat("excel");
      else setExportFormat("pdf");
    }
  }

  async function fetchAllPagesRows() {
    const all = [];
    const totalPgs = Math.max(1, Math.ceil((totalRows || 0) / limit));
    for (let p = 1; p <= totalPgs; p++) {
      const params = buildSearchParams({ page: p, limit });
      const url = `${API_URL}/admin/reports/messages?${params.toString()}`;
      const res = await authFetch(url);
      const json = await res.json();
      if (json?.mode === "rows" && Array.isArray(json.rows)) {
        all.push(...json.rows);
      }
    }
    return all;
  }

  function decorateForExport(rowsRaw) {
    const sessionContact = new Map();
    const out = [];

    for (let i = rowsRaw.length - 1; i >= 0; i--) {
      const r = rowsRaw[i];
      const sid = r.session_id;
      const fromIndex = convoIndex.get(sid) || {};
      const inherited = sessionContact.get(sid) || { name: undefined, phone: undefined, isEmp: undefined };
      const name = r.user_name || inherited.name || fromIndex.name || "—";
      const phone = r.user_phone || inherited.phone || fromIndex.phone || "—";

      let isEmp = inherited.isEmp ?? fromIndex.isEmp;
      if (r.author === "Employee" || r.author === "FAQ_EMP") isEmp = true;
      if (r.author === "User" || r.author === "FAQ") isEmp = isEmp === true ? true : false;

      sessionContact.set(sid, { name, phone, isEmp });
    }

    let lastSession = null;
    for (let i = 0; i < rowsRaw.length; i++) {
      const r = rowsRaw[i];
      const sid = r.session_id;
      const firstOfSession = sid !== lastSession;
      if (firstOfSession) lastSession = sid;

      const sc = sessionContact.get(sid) || {};
      const contactName = r.user_name || sc.name || "—";
      const contactPhone = r.user_phone || sc.phone || "—";
      const isEmpContact = sc.isEmp === true || r.author === "Employee" || r.author === "FAQ_EMP";

      const isOperator = r.author === "Human";
      const isFaqLead = r.author === "FAQ";
      const isFaqEmployee = r.author === "FAQ_EMP";
      const isBot =
        (r.bot_response ?? r.response ?? null) &&
        (r.author === "User" || r.author === "Employee") &&
        !isOperator &&
        !isFaqLead &&
        !isFaqEmployee;

      const derivedLegit =
        isOperator ? true : r.legitimate === true ? true : r.legitimate === false ? false : null;

      const responseText = r.bot_response ?? r.response ?? "—";
      const messageText = isOperator ? "—" : r.user_message ?? r.userMessage ?? "—";

      const { label, dateText } = formatDateLabel(r.created_at);

      out.push({
        created_at_label: label,
        created_at_date: dateText,
        created_at_time: r.created_at?.split(" ")[1]?.slice(0, 5) || "",
        contact_name: contactName,
        contact_phone: contactPhone,
        contact_is_employee: isEmpContact,
        session_code: `N°${sid}`,
        message: messageText,
        response: responseText,
        tag_operador: isOperator ? "[Operador]" : "",
        tag_faq: isFaqLead ? "[FAQ]" : "",
        tag_faq_emp: isFaqEmployee ? "[FAQ Colaborador]" : "",
        tag_bot: isBot ? "[Chatbot]" : "",
        legit: derivedLegit === true ? "✔" : derivedLegit === false ? "✖" : "—",
        _firstOfSession: firstOfSession,
        _isLead: !isEmpContact,
      });
    }
    return out;
  }

  async function doExport() {
    try {
      setExporting(true);
      const scope = exportScope;
      const caps = computeExportCapabilities(scope);

      if (scope === "all") {
        if (!caps.allowExcel && !caps.allowPDF && caps.allowCSV) {
          const params = buildSearchParams({});
          const url = `${API_URL}/admin/reports/messages/export_csv?${params.toString()}`;
          const res = await authFetch(url);
          const blob = await res.blob();
          const dl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = dl;
          a.download = `relatorio-conversas_${filters.start}_a_${filters.end}.csv`;
          a.click();
          URL.revokeObjectURL(dl);
          setShowExportBar(false);
          return;
        }
      }

      let rawRows = [];
      if (scope === "page") rawRows = rows;
      else rawRows = await fetchAllPagesRows();

      const exportRows = decorateForExport(rawRows);

      if (exportFormat === "excel") {
        await exportExcel(exportRows);
      } else if (exportFormat === "pdf") {
        await exportPdf(exportRows);
      } else if (exportFormat === "csv") {
        exportCsvLocal(exportRows);
      }

      setShowExportBar(false);
    } catch (err) {
      console.error(err);
      alert("Falha ao exportar o relatório.");
    } finally {
      setExporting(false);
    }
  }

  /* ========================= Excel ========================= */

  function outlineRange(ws, startRow, endRow, startCol, endCol, color = "FF000000", style = "thick") {
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const cell = ws.getCell(r, c);
        const prev = cell.border || {};
        cell.border = {
          top:    r === startRow ? { style, color: { argb: color } } : prev.top,
          bottom: r === endRow   ? { style, color: { argb: color } } : prev.bottom,
          left:   c === startCol ? { style, color: { argb: color } } : prev.left,
          right:  c === endCol   ? { style, color: { argb: color } } : prev.right,
        };
      }
    }
  }

  async function exportExcel(exportRows) {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("Mensagens");

    // ---- OFFSET da tabela ----
    const ORIGIN_COL = 2; // B
    const ORIGIN_ROW = 2; // linha onde fica o TÍTULO (B2)
    const header = [
      "Data", "Hora", "Contato (Nome)", "Telefone", "Conversa",
      "Mensagem", "Resposta", "Quem respondeu?", "Mensagem Legítima?"
    ];
    const END_COL = ORIGIN_COL + header.length - 1;

    // TÍTULO em B2
    ws.mergeCells(ORIGIN_ROW, ORIGIN_COL, ORIGIN_ROW, END_COL);
    const titleCell = ws.getCell(ORIGIN_ROW, ORIGIN_COL);
    titleCell.value = "Relatório de Mensagens";
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF9CA3AF" } };

    // PERÍODO em B3
    ws.mergeCells(ORIGIN_ROW + 1, ORIGIN_COL, ORIGIN_ROW + 1, END_COL);
    const periodCell = ws.getCell(ORIGIN_ROW + 1, ORIGIN_COL);
    periodCell.value = `Período: ${filters.start} a ${filters.end}`;
    periodCell.font = { bold: true };
    periodCell.alignment = { vertical: "middle", horizontal: "center" };
    periodCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF9CA3AF" } };

    // Cabeçalho em B4
    const HEADER_ROW = ORIGIN_ROW + 2;
    const paddedHeader = Array(ORIGIN_COL - 1).fill(null).concat(header);
    const headerRow = ws.getRow(HEADER_ROW);
    headerRow.values = paddedHeader;

    // Larguras (a partir da coluna B)
    const widths = [12, 8, 22, 16, 10, 46, 80, 18, 14];
    widths.forEach((w, i) => (ws.getColumn(ORIGIN_COL + i).width = w));

    // Estilo do cabeçalho só no range da tabela
    for (let c = ORIGIN_COL; c <= END_COL; c++) {
      const cell = headerRow.getCell(c);
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5A2EBB" } };
      cell.border = {
        top: { style: "thin", color: { argb: "FFBDB4EF" } },
        left: { style: "thin", color: { argb: "FFBDB4EF" } },
        bottom: { style: "thin", color: { argb: "FFBDB4EF" } },
        right: { style: "thin", color: { argb: "FFBDB4EF" } },
      };
    }

    // Dados (a partir da linha seguinte ao cabeçalho)
    let rIndex = HEADER_ROW;
    let sessionToggle = false;
    let lastSessionCode = null;

    for (const r of exportRows) {
      rIndex++;
      const tags = [r.tag_operador, r.tag_faq, r.tag_faq_emp, r.tag_bot].filter(Boolean).join(" ");
      const values = [
        r.created_at_date || "",
        r.created_at_time || "",
        r.contact_name || "",
        r.contact_phone || "",
        r.session_code || "",
        r.message || "",
        r.response || "",
        tags,
        r.legit || "—",
      ];

      const row = ws.getRow(rIndex);
      row.values = Array(ORIGIN_COL - 1).fill(null).concat(values);
      row.alignment = { wrapText: true, vertical: "top" };

      const isNewSession = r.session_code !== lastSessionCode;
      if (isNewSession) {
        sessionToggle = !sessionToggle;
        lastSessionCode = r.session_code;
      }

      const bg = sessionToggle ? "FFE5E7EB" : "FFFFFFFF";
      for (let c = ORIGIN_COL; c <= END_COL; c++) {
        const cell = row.getCell(c);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        cell.border = {
          top: { style: isNewSession ? "medium" : "thin", color: { argb: "FF9CA3AF" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };
      }
    }

    // Moldura grossa envolvendo TODA a tabela (do cabeçalho ao final)
    const startRow = 2;
    const endRow   = rIndex;
    const startCol = ORIGIN_COL;
    const endCol   = END_COL;
    outlineRange(ws, startRow, endRow, startCol, endCol, "FF000000", "thick");

    // Download
    const buf = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    const scopeLabel = exportScope === "all" ? "todas" : "pagina";
    a.href = url;
    a.download = `relatorio-conversas_${scopeLabel}_${filters.start}_a_${filters.end}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  /* ========================= PDF (A4 landscape; larguras fixas; texto sanitizado) ========================= */
  async function exportPdf(exportRows) {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const margin = 2;
    const usable = doc.internal.pageSize.getWidth() - margin * 2;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.text("Relatório de Mensagens", margin, 12);
    doc.setFontSize(10);
    doc.text(`Período: ${filters.start} a ${filters.end}`, margin, 18);

    const cols = [
      { header: "Data",               dataKey: "data",     w: 20 },
      { header: "Hora",               dataKey: "hora",     w: 12 },
      { header: "Contato (Nome)",     dataKey: "nome",     w: 34 },
      { header: "Telefone",           dataKey: "fone",     w: 30 },
      { header: "Conversa",           dataKey: "sessao",   w: 20 },
      { header: "Mensagem",           dataKey: "mensagem", w: 54 },
      { header: "Resposta",           dataKey: "resposta", w: 82 },
      { header: "Quem respondeu?",    dataKey: "tags",     w: 22 },
      { header: "Mensagem legítima?", dataKey: "legit",    w: 20 },
    ];

    const BG_GRAY = [229, 231, 235];
    const BG_WHITE   = [255, 255, 255];

    let stripeToggle = false;
    const bodyRows = exportRows.map((r) => {
      if (r._firstOfSession) stripeToggle = !stripeToggle;
      const bg = stripeToggle ? BG_GRAY : BG_WHITE;

      const tags = [r.tag_operador, r.tag_faq, r.tag_faq_emp, r.tag_bot].filter(Boolean).join(" ");
      const nomeBadge = `${r.contact_name || "—"}  ${r._isLead ? "[Lead]" : "[Colaborador]"}`;

      return {
        _firstOfSession: r._firstOfSession === true,
        _bg: bg,
        data: r.created_at_date || "",
        hora: r.created_at_time || "",
        nome: normalizeTextForPDF(nomeBadge),
        fone: normalizeTextForPDF(r.contact_phone || ""),
        sessao: normalizeTextForPDF(r.session_code || ""),
        mensagem: normalizeTextForPDF(r.message || ""),
        resposta: normalizeTextForPDF(r.response || ""),
        tags: normalizeTextForPDF(tags),
        legit: r.legit ? (r.legit === "✔" ? "Sim" : "Não") : "Não identificado",
      };
    });

    autoTable(doc, {
      startY: 24,
      columns: cols,
      body: bodyRows,
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: 2,
        overflow: "linebreak",
        valign: "top",
        halign: "left",
        lineColor: [229, 231, 235],
        lineWidth: 0.2,
        lineHeight: 1.35,
        minCellHeight: 6,
      },
      headStyles: {
        fillColor: [90, 46, 187],
        textColor: 255,
        fontStyle: "bold",
        halign: "left",
        lineColor: [189, 180, 239],
        lineWidth: 0.3,
      },
      columnStyles: cols.reduce((acc, c) => {
        acc[c.dataKey] = { cellWidth: c.w };
        return acc;
      }, {}),
      tableWidth: usable,
      margin: { left: margin, right: margin },

      didParseCell: (d) => {
        if (d.section !== "body") return;

        const raw = d.row.raw || {};
        d.cell.styles.fillColor = raw._bg || BG_WHITE;

        if (raw._firstOfSession) {
          d.cell.styles.lineWidthTop  = 0.8;
          d.cell.styles.lineColorTop  = [109, 40, 217];

          d.cell.styles.lineWidthRight = 0.2;
          d.cell.styles.lineWidthLeft  = 0.2;
          d.cell.styles.lineWidthBottom= 0.2;
          d.cell.styles.lineColorRight = [229, 231, 235];
          d.cell.styles.lineColorLeft  = [229, 231, 235];
          d.cell.styles.lineColorBottom= [229, 231, 235];
        }
      },
    });

    const scopeLabel = exportScope === "all" ? "todas" : "pagina";
    doc.save(`relatorio-conversas_${scopeLabel}_${filters.start}_a_${filters.end}.pdf`);
  }

  /* ========================= CSV (opcional) ========================= */
  function exportCsvLocal(exportRows) {
    const header = [
      "Data", "Hora", "Nome", "Telefone", "Conversa", "Mensagem", "Resposta", "Tags", "Mensagem Legitima"
    ];
    const lines = [header.join(";")];
    for (const r of exportRows) {
      const tags = [r.tag_operador, r.tag_faq, r.tag_faq_emp, r.tag_bot].filter(Boolean).join(" ");
      const row = [
        r.created_at_date || "",
        r.created_at_time || "",
        r.contact_name || "",
        r.contact_phone || "",
        r.session_code || "",
        (r.message || "").replace(/\r?\n/g, " "),
        (r.response || "").replace(/\r?\n/g, " "),
        tags,
        r.legit || "—",
      ];
      lines.push(row.map((v) => `"${(v + "").replace(/"/g, '""')}"`).join(";"));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    const scopeLabel = exportScope === "all" ? "todas" : "pagina";
    a.href = url;
    a.download = `relatorio-conversas_${scopeLabel}_${filters.start}_a_${filters.end}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  /* ========================= Render ========================= */
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Relatórios de Mensagens</h2>
      <DateFilters value={{ start: filters.start, end: filters.end }} onApply={handleApplyFilters} includePhone={false} />

      {message && (
        <div
          className={`mb-4 mt-2 p-2 rounded shadow text-center font-semibold w-[422px] ${
            message.includes("datas") || message.includes("Erro")
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          }`}
          id="filters_applied"
        >
          {message}
        </div>
      )}

      <div className="mt-2 mb-3">
        <div className="flex items-center gap-3 mb-2">
          <button className="text-sm text-primary hover:underline" onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? "Ocultar filtros avançados" : "Mostrar filtros avançados"}
          </button>
          <div className="flex-1" />
        </div>

        {showAdvanced && (
          <div className="mt-2 mb-4 p-3 border rounded-lg bg-gray-50">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-700 mb-1">Nome (contém)</label>
                <input
                  className="border rounded-lg w-full px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Digite o nome do contato, ou parte do nome."
                  value={filters.q_name}
                  onChange={(e) => setFilters((f) => ({ ...f, q_name: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-700 mb-1">Telefone (contém)</label>
                <input
                  className="border rounded-lg w-full px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Digite o número, ou parte do número."
                  value={filters.q_phone}
                  onChange={(e) => setFilters((f) => ({ ...f, q_phone: e.target.value.replace(/\D/g, "") }))}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Autor da mensagem</label>
                <select
                  className="border rounded-lg w-full px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={filters.author_msg}
                  onChange={(e) => setFilters((f) => ({ ...f, author_msg: e.target.value }))}
                >
                  <option value="">Todos</option>
                  <option value="Lead">Lead</option>
                  <option value="Colaborador">Colaborador</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Autor da resposta</label>
                <select
                  className="border rounded-lg w-full px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={filters.author_resp}
                  onChange={(e) => setFilters((f) => ({ ...f, author_resp: e.target.value }))}
                >
                  <option value="">Todos</option>
                  <option value="Chatbot">Chatbot</option>
                  <option value="Operador">Operador</option>
                  <option value="FAQ">FAQ</option>
                  <option value="FAQ_EMP">FAQ (Colaborador)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Atendimento de Operador?</label>
                <select
                  className="border rounded-lg w-full px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={filters.operator_service}
                  onChange={(e) => setFilters((f) => ({ ...f, operator_service: e.target.value }))}
                >
                  <option value="">Todos</option>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Intenção da mensagem</label>
                <select
                  className="border rounded-lg w-full px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={filters.intent}
                  onChange={(e) => setFilters((f) => ({ ...f, intent: e.target.value }))}
                >
                  <option value="">Todas</option>
                  <option value="legit">Legítima</option>
                  <option value="irrelevant">Irrelevante</option>
                </select>
              </div>

              <div className="md:col-span-6 flex items-end gap-2">
                <button
                  className="px-3 py-2 rounded border"
                  onClick={() => {
                    setFilters((f) => ({
                      ...f,
                      q_name: "",
                      q_phone: "",
                      author_msg: "",
                      author_resp: "",
                      operator_service: "",
                      intent: "",
                    }));
                    setPage(1);
                    setApplyKey((k) => k + 1);
                  }}
                >
                  Limpar
                </button>
                <button
                  className="bg-primary text-white px-3 py-2 rounded hover:bg-purple-700"
                  onClick={() => {
                    setPage(1);
                    setApplyKey((k) => k + 1);
                  }}
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Header + botão Exportar sempre visível */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            className="bg-emerald-600 text-white px-3 py-2 rounded hover:bg-emerald-500"
            onClick={toggleExportBar}
            disabled={loading || totalRows === 0}
            title={totalRows === 0 ? "Sem dados para exportar" : "Exportar"}
          >
            Exportar
          </button>
        </div>
        <SessionLegend />
      </div>

      {/* Barra de export */}
      <div className="mb-4">
        {showExportBar && (
          <div className="p-3 border rounded-lg bg-gray-50">
            <div className="flex flex-col lg:flex-row lg:items-end gap-3">
              <div>
                <div className="text-sm font-semibold mb-1">Modelo de Impressão</div>
                <div className="flex gap-3">
                  <label className="text-sm flex items-center gap-1">
                    <input
                      type="radio"
                      name="scope"
                      value="page"
                      checked={exportScope === "page"}
                      onChange={() => onChangeScope("page")}
                    />
                    Página atual ({page} de {totalPages})
                  </label>
                  <label className="text-sm flex items-center gap-1">
                    <input
                      type="radio"
                      name="scope"
                      value="all"
                      checked={exportScope === "all"}
                      onChange={() => onChangeScope("all")}
                      disabled={totalRows === 0}
                    />
                    Todas as páginas ({totalPages})
                  </label>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold mb-1">Formato do Relatório</div>
                {(() => {
                  const caps = computeExportCapabilities(exportScope);
                  return (
                    <div className="flex gap-3">
                      <label className={`text-sm flex items-center gap-1 ${!caps.allowPDF ? "opacity-50" : ""}`}>
                        <input
                          type="radio"
                          name="fmt"
                          value="pdf"
                          disabled={!caps.allowPDF}
                          checked={exportFormat === "pdf"}
                          onChange={() => setExportFormat("pdf")}
                        />
                        PDF
                      </label>
                      <label className={`text-sm flex items-center gap-1 ${!caps.allowExcel ? "opacity-50" : ""}`}>
                        <input
                          type="radio"
                          name="fmt"
                          value="excel"
                          disabled={!caps.allowExcel}
                          checked={exportFormat === "excel"}
                          onChange={() => setExportFormat("excel")}
                        />
                        Excel
                      </label>
                      {caps.allowCSV && (
                        <label className="text-sm flex items-center gap-1">
                          <input
                            type="radio"
                            name="fmt"
                            value="csv"
                            disabled={!caps.allowCSV}
                            checked={exportFormat === "csv"}
                            onChange={() => setExportFormat("csv")}
                          />
                          CSV
                        </label>
                      )}
                    </div>
                  );
                })()}
                {exportScope === "all" && computeExportCapabilities("all").reason && (
                  <div className="text-xs text-gray-600 mt-1">{computeExportCapabilities("all").reason}</div>
                )}
              </div>

              <div className="flex-1" />

              <div className="flex gap-2">
                <button className="px-3 py-2 rounded border" onClick={() => setShowExportBar(false)} disabled={exporting}>
                  Fechar
                </button>
                <button
                  className={`px-3 py-2 rounded text-white ${
                    exporting ? "bg-gray-500" : "bg-green-600 hover:bg-green-700"
                  }`}
                  onClick={doExport}
                  disabled={exporting}
                >
                  {exporting ? "Exportando..." : "Gerar arquivo"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid */}
      <DataGrid
        rows={decorated}
        totalRows={totalRows}
        page={page}
        setPage={setPage}
        limit={limit}
        setLimit={setLimit}
      />
    </div>
  );
}

function DataGrid({ rows, totalRows, page, setPage, limit, setLimit }) {
  function DateCell({ dateStr }) {
    const { label, dateText, timeText } = formatDateLabel(dateStr);
    return (
      <div className="text-black">
        {label ? <div className="font-bold">{label}</div> : null}
        <div className={label ? "text-gray-700" : "font-bold"}>{dateText}</div>
        <div className="text-xs text-gray-700">{timeText}</div>
      </div>
    );
  }

  // classe utilitária para a divisória vertical
  const colDividerTh = "px-3 py-2 text-left border-r border-gray-400 last:border-r-0";
  const colDividerTd = "align-top px-3 py-2 border-r border-gray-400 last:border-r-0";

  return (
    <>
      <div className="mt-2 overflow-x-auto border border-gray-400 rounded-xl">
        <table className="min-w-full text-sm border-collapse">
          <thead className="bg-primary text-white">
            <tr>
              <th className={colDividerTh}>Data</th>
              <th className={colDividerTh}>Contato</th>
              <th className={colDividerTh}>Conversa</th>
              <th className={colDividerTh}>Mensagem</th>
              <th className={colDividerTh}>Resposta</th>
              <th className={colDividerTh}>Mensagem Legitima</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-gray-600">
                  Sem resultados para os filtros.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const responseText = r.bot_response ?? r.response ?? "—";
              // telefone para o link (usa o bruto se existir, senão o decorado)
              const phoneForLink = (r.user_phone || r._contactPhone || "").toString().replace(/\D/g, "");
              const hasPhone = phoneForLink.length > 0;

              return (
                <tr
                  key={r.message_id}
                  className={`${r._sessionBg} ${r._firstOfSession ? "border-t-2 border-gray-400" : ""}`}
                >
                  <td className={colDividerTd}>
                    <DateCell dateStr={r.created_at} />
                  </td>

                  <td className={colDividerTd}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">{r._contactName}</span>
                      {r._isEmployeeContact ? (
                        <Badge className="bg-amber-200 text-amber-800">Colaborador</Badge>
                      ) : (
                        <Badge className="bg-sky-200 text-sky-800">Lead</Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{r._contactPhone}</div>
                  </td>

                  <td className={colDividerTd}>
                    {hasPhone ? (
                      <Link
                        to={`/conversas?phone=${encodeURIComponent(phoneForLink)}`}
                        className="text-primary font-semibold hover:underline"
                        title="Abrir conversa"
                      >
                        N°{r.session_id}
                      </Link>
                    ) : (
                      <span className="text-gray-700 font-semibold">N°{r.session_id}</span>
                    )}
                  </td>

                  <td className={`${colDividerTd} whitespace-pre-wrap break-words`}>
                    {r.author === "Human" ? "—" : r.user_message ?? r.userMessage ?? "—"}
                  </td>

                  <td className={`${colDividerTd} whitespace-pre-wrap break-words`}>
                    <div className="flex items-start gap-2 flex-wrap">
                      {r._isOperator && <Badge className="bg-blue-700 text-white">Operador</Badge>}
                      {r._isFaqLead && <Badge className="bg-gray-300 text-gray-800">FAQ</Badge>}
                      {r._isFaqEmployee && <Badge className="bg-amber-200 text-amber-800">FAQ Colaborador</Badge>}
                      {r._isBotResponder && <Badge className="bg-primary text-purple-100">Chatbot</Badge>}
                      <span>{responseText}</span>
                    </div>
                  </td>

                  <td className={colDividerTd}>
                    {r._derivedLegit === true && <Badge className="bg-green-200 text-green-800">✔</Badge>}
                    {r._derivedLegit === false && <Badge className="bg-red-200 text-red-800">✖</Badge>}
                    {r._derivedLegit === null && <span className="text-gray-400">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {totalRows ?? 0} linha(s) • Página {page} de {Math.max(1, Math.ceil((totalRows || 0) / limit))}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Por página:</label>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            disabled={page >= Math.max(1, Math.ceil((totalRows || 0) / limit))}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </button>
        </div>
      </div>
    </>
  );
}
