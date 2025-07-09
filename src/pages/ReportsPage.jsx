import React, { useState } from "react";
import DateFilters from "../components/DateFilters";
import { authFetch } from "../utils/authFetch";
import { useAuth } from '../utils/authData';
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import { BrowserRouter as Navigate } from "react-router-dom";

export default function ReportsPage() {
  const [filters, setFilters] = useState({ start: "", end: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [filtersApplied, setFiltersApplied] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL;
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const COMPANY_ID = user? user.company_id: 0;

  function handleApplyFilters(newFilters) {
    if (newFilters.start && newFilters.end) {
      setFilters(newFilters);
      setMessage("Filtros aplicados!");
      setFiltersApplied(true); // só mostra botões depois do aplicar
      setTimeout(() => setMessage(""), 2500);
    } else {
      setMessage("Por favor selecione as duas datas!");
      setFiltersApplied(false);
      setTimeout(() => setMessage(""), 2500);
    }
  }

  function cleanText(str) {
    if (!str) return "";
    let clean = str.replace(/[^\x20-\x7EÀ-ÿ\n\r]/g, ""); 
    clean = clean.replace(/\s\s+/g, " ");
    clean = clean.replace(/[ØÞ]/g, "");
    clean = clean.replace(/<[^>]*>?/gm, "");
    return clean.trim();
  }

  async function fetchMessages() {
    if (!filters.start || !filters.end) {
      alert("Selecione as datas!");
      return [];
    }
    setLoading(true);
    try {
      let url = `${API_URL}/admin/messages?start_date=${filters.start}&end_date=${filters.end}&company_id=${COMPANY_ID}`
      if (filters.phone) url += `&phone=55${encodeURIComponent(filters.phone)}`;
      const res = await authFetch(url);
      const data = await res.json();
      return data.messages || [];
    } catch (e) {
      alert("Erro ao buscar mensagens.");
      return [];
    } finally {
      setLoading(false);
    }
  }

  async function exportExcel(startDate, endDate) {
    const messages = await fetchMessages();
    if (!messages.length) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Mensagens");

    worksheet.getRow(1).height = 8;
    worksheet.getColumn(1).width = 3;

    worksheet.mergeCells('B2:E2');
    const titleCell = worksheet.getCell('B2');
    titleCell.value = "RELATÓRIO DE CONVERSAS";
    titleCell.font = { bold: true, size: 18 };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFBFBFBF" } };

    worksheet.mergeCells('B3:E3');
    const dateCell = worksheet.getCell('B3');
    dateCell.value = `De: ${startDate} | Até: ${endDate}`;
    dateCell.font = { bold: true, size: 15 };
    dateCell.alignment = { vertical: "middle", horizontal: "center" };
    dateCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFBFBFBF" } };

    const headers = ["Telefone", "Mensagem Usuário", "Resposta Bot", "Data"];
    headers.forEach((header, i) => {
      const cell = worksheet.getCell(4, i + 2);
      cell.value = header;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5A2EBB' } };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      };
    });

    messages.forEach((msg, idx) => {
      const rowIdx = idx + 5;
      worksheet.getCell(rowIdx, 2).value = msg.user_phone;
      worksheet.getCell(rowIdx, 3).value = msg.user_message;
      worksheet.getCell(rowIdx, 4).value = msg.bot_response;
      worksheet.getCell(rowIdx, 5).value = msg.created_at;

      for (let col = 2; col <= 5; col++) {
        const cell = worksheet.getCell(rowIdx, col);
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
        cell.font = { size: 11 };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" }
        };
      }
    });

    worksheet.getColumn(2).width = 15;
    worksheet.getColumn(3).width = 25;
    worksheet.getColumn(4).width = 60;
    worksheet.getColumn(5).width = 12;
    worksheet.getColumn(5).alignment = {vertical: "middle", horizontal: "center", wrapText: true}
    worksheet.getRow(2).height = 25;
    worksheet.getRow(3).height = 25;
    worksheet.getRow(4).height = 20;

    const firstRow = 2;
    const lastRow = messages.length + 4;
    const firstCol = 2;
    const lastCol = 5;

    for (let row = firstRow; row <= lastRow; row++) {
      for (let col = firstCol; col <= lastCol; col++) {
        const cell = worksheet.getRow(row).getCell(col);
        cell.border = cell.border || {};
        cell.border.top = cell.border.top || { style: "thin" };
        cell.border.left = cell.border.left || { style: "thin" };
        cell.border.bottom = cell.border.bottom || { style: "thin" };
        cell.border.right = cell.border.right || { style: "thin" };

        if (row === firstRow) cell.border.top = { style: "thick" };
        if (row === lastRow) cell.border.bottom = { style: "thick" };
        if (col === firstCol) cell.border.left = { style: "thick" };
        if (col === lastCol) cell.border.right = { style: "thick" };
      }
    }

    const buf = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "relatorio-conversas.xlsx";
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async function exportPdf() {
    const messages = await fetchMessages();
    if (!messages.length) return;

    const doc = new jsPDF("landscape");
    doc.text("Relatório de Mensagens", 14, 12);

    const tableColumn = [
      "Telefone",
      "Mensagem Usuário",
      "Resposta Bot",
      "Data",
    ];
    const tableRows = messages.map(msg => [
      cleanText(msg.user_phone),
      cleanText(msg.user_message),
      cleanText(msg.bot_response),
      cleanText(msg.created_at),
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        valign: 'middle',
        halign: 'left',
        lineWidth: 0.3,
        lineColor: [180, 180, 180]
      },
      headStyles: { fillColor: [90, 46, 187], textColor: 255 },
      margin: { left: 14, right: 14 },
      tableWidth: "auto",
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 50 },
        2: { cellWidth: 100 },
        3: { cellWidth: 18 }
      },
    });

    doc.save("relatorio-mensagens.pdf");
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Exportação de Mensagens</h2>
      <DateFilters onApply={handleApplyFilters} />
      {message && (
        <div
          className={`mb-4 p-2 rounded shadow text-center font-semibold w-[422px] ${
            message.includes("duas datas")
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          }`}
          id="filters_applied"
        >
          {message}
        </div>
      )}
      {filtersApplied && (
        <div className="flex gap-4">
          <button
            className="bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 transition"
            onClick={() => exportExcel(filters.start, filters.end)}
            disabled={loading}
          >
            Exportar Excel
          </button>
          <button
            className="bg-red-600 text-white px-4 py-2 rounded-lg shadow hover:bg-red-700 transition"
            onClick={exportPdf}
            disabled={loading}
          >
            Exportar PDF
          </button>
        </div>
      )}
    </div>
  );
}
