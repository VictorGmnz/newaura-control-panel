import React, { useState, useMemo } from "react";
import { api } from "../utils/apiClient";

function fmtDateYMD(d = new Date()) {
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function fmtDateBR(ymd) {
  if (!ymd) return "—";
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

export default function SatisfactionSendNow({companyName,customerName,customerId,contactPhone,onSent,}) {
  const [open, setOpen] = useState(false);
  const [jobDate, setJobDate] = useState(() => fmtDateYMD());
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  const preview = useMemo(() => {
    return [
      "Pesquisa de Satisfação",
      "",
      `Olá ${customerName}! Aqui é o atendente virtual da ${companyName}.`,
      "",
      `Recentemente finalizamos um atendimento à sua empresa no dia ${fmtDateBR(jobDate)}.`,
      "",
      "Poderia compartilhar sua avaliação dos serviços prestados respondendo uma breve pesquisa aqui mesmo no WhatsApp?"
    ].join("\n");
  }, [companyName, customerName, jobDate]);

  async function handleSend() {
    setErr("");

    if (!customerId) {
      setErr("Cliente inválido.");
      return;
    }
    if (!contactPhone) {
      setErr("Telefone do contato não encontrado.");
      return;
    }
    if (!jobDate) {
      setErr("Informe a data do serviço.");
      return;
    }

    try {
      setSending(true);
      await api.post("/admin/feedbacks/send-now", {
        customer_id: customerId,
        contact_phone: contactPhone,
        job_date: jobDate
      });
      setOpen(false);
      onSent && onSent();
    } catch (e) {
      console.error(e);
      const detail = e?.response?.data?.detail;
      setErr(detail ? String(detail) : "Falha ao enviar o convite. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="flex justify-end mb-3">
        <button
          className="px-3 py-2 rounded-md bg-primary text-white hover:bg-purple-700" 
          style={{ filter: "drop-shadow(0 0 8px #5A2EBB"}}
          onClick={() => {
            // sempre abre com hoje preenchido
            setJobDate(fmtDateYMD());
            setErr("");
            setOpen(true);
          }}
        >
          Enviar Pesquisa Agora
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white max-w-lg w-full rounded-xl p-5">
            <h3 className="text-lg font-semibold mb-4">Enviar pesquisa</h3>

            <label className="block text-sm mb-1">
              Data do serviço
            </label>
            <input
              type="date"
              value={jobDate}
              onChange={e => setJobDate(e.target.value)}
              className="border rounded-md px-3 py-2 w-full mb-3"
            />

            <label className="block text-sm mb-1">Preview da mensagem</label>
            <pre className="whitespace-pre-wrap border rounded-md p-3 bg-gray-50 text-sm mb-3">
              {preview}
            </pre>

            {err && (
              <div className="mb-3 text-sm text-red-700 bg-red-100 border border-red-200 rounded p-2">
                {err}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                className="px-3 py-2 rounded-md border"
                onClick={() => setOpen(false)}
                disabled={sending}
              >
                Cancelar
              </button>
              <button
                className="px-3 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                onClick={handleSend}
                disabled={true}
                title="Não é possível enviar a pesquisa no momento. Contate o Administrador do Sistema."
              >
                {sending ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
