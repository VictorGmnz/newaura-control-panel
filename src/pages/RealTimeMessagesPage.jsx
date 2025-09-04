import React, { useEffect, useMemo, useState, useRef } from "react";
import { useAuth } from "../utils/authData";
import { authFetch } from "../utils/authFetch";
import {
  FaUser,
  FaComments,
  FaRobot,
  FaUserCheck,
  FaChevronRight,
  FaSync,
  FaArrowLeft,
  FaExclamationTriangle
} from "react-icons/fa";
import { useLocation } from "react-router-dom";

export default function RealTimeMessagesPage() {
  const { user } = useAuth();
  const location = useLocation();

  const [conversas, setConversas] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [msg, setMsg] = useState("");
  const [myMessage, setMyMessage] = useState("");
  const [isTakingOver, setIsTakingOver] = useState(false);
  const [initialPhone, setInitialPhone] = useState(null);

  const [seatStatus, setSeatStatus] = useState(null);

  const pollingRef = useRef();
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const phone = sp.get("phone");
    setInitialPhone(phone || null);
  }, [location.search]);

  function fetchConversas() {
    authFetch(`${API_URL}/conversations/active/sessions?company_id=${user.company_id}`)
      .then(res => res.json())
      .then(data => {
        const list = data.conversations || [];
        setConversas(list);
      });
  }

  function fetchMensagens(session_id) {
    if (!session_id) return;
    authFetch(`${API_URL}/conversations/session/${session_id}?company_id=${user.company_id}`)
      .then(res => res.json())
      .then(data => {
        setMensagens(data.messages || []);
      });
  }

  function fetchSeatStatus() {
    authFetch(`${API_URL}/conversations/live_attendants/status?company_id=${user.company_id}&human_id=${user.id}`)
      .then(res => res.json())
      .then(data => setSeatStatus(data))
      .catch(() => {});
  }

  useEffect(() => {
    fetchConversas();
    fetchSeatStatus();
    pollingRef.current = setInterval(() => {
      fetchConversas();
      fetchSeatStatus();
      if (selectedSession) fetchMensagens(selectedSession.session_id);
    }, 3000);
    return () => clearInterval(pollingRef.current);
  }, [selectedSession]);

  useEffect(() => {
    if (msg) {
      const timeout = setTimeout(() => setMsg(""), 3500);
      return () => clearTimeout(timeout);
    }
  }, [msg]);

  useEffect(() => {
    if (!initialPhone || selectedSession || conversas.length === 0) return;
    const target = conversas.find(c => String(c.user_phone || "").includes(String(initialPhone)));
    if (target) handleSelect(target);
  }, [initialPhone, conversas, selectedSession]);

  function handleSelect(session) {
    setSelectedSession(session);
    setMensagens([]);
    fetchMensagens(session.session_id);
    setMsg("");
    setMyMessage("");
  }

  function refreshSelectedSession(session_id) {
    authFetch(`${API_URL}/conversations/active/sessions?company_id=${user.company_id}`)
      .then(res => res.json())
      .then(data => {
        setConversas(data.conversations || []);
        const sess = (data.conversations || []).find(c => c.session_id === session_id);
        if (sess) setSelectedSession(sess);
      });
  }

  async function takeover() {
    if (!selectedSession) return;
    setIsTakingOver(true);
    try {
      const pre = await authFetch(
        `${API_URL}/conversations/live_attendants/status?company_id=${user.company_id}&human_id=${user.id}`
      ).then(r => r.json());
      setSeatStatus(pre);

      if (pre && pre.can_take === false && pre.reason === "limit-reached") {
        setMsg(`Limite de Operadores atingido (${pre.in_use}/${pre.limit}). Aguarde alguém devolver ao bot.`);
        return;
      }

      const data = await authFetch(
        `${API_URL}/conversations/chatbot/takeover/${selectedSession.session_id}?human_id=${user.id}&company_id=${user.company_id}`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      ).then(r => r.json());

      if (data?.detail) {
        setMsg(data.detail);
      } else {
        setMsg("Você assumiu o controle da conversa.");
        refreshSelectedSession(selectedSession.session_id);
        fetchSeatStatus();
      }
    } catch (e) {
      setMsg("Não foi possível assumir o controle no momento.");
    } finally {
      setIsTakingOver(false);
    }
  }

  function returnToBot() {
    if (!selectedSession) return;

    const holderId = Number(
      selectedSession?.employee_id ?? selectedSession?.takeover_by ?? NaN
    );
    const isMine =
      selectedSession?.control === "human" && holderId === Number(user.id);

    if (selectedSession.control === "human" && !isMine) {
      setMsg(
        `A conversa está em atendimento por ${
          selectedSession.employee_name || "outro operador"
        }. Apenas ele pode devolver ao bot.`
      );
      return;
    }

    setIsTakingOver(true);
    authFetch(
      `${API_URL}/conversations/chatbot/takeback/${selectedSession.session_id}?company_id=${user.company_id}`,
      { method: "POST" }
    )
      .then(res => res.json())
      .then((data) => {
        if (data?.detail) setMsg(data.detail);
        else setMsg("Controle devolvido ao bot.");
        refreshSelectedSession(selectedSession.session_id);
        fetchSeatStatus();
      })
      .finally(() => setIsTakingOver(false));
  }

  function sendHumanMessage(e) {
    e.preventDefault();
    if (!myMessage.trim()) return;

    const holderId = Number(
      selectedSession?.employee_id ?? selectedSession?.takeover_by ?? NaN
    );
    const isMine =
      selectedSession?.control === "human" && holderId === Number(user.id);

    if (!isMine) {
      setMsg(
        `Somente ${
          selectedSession?.employee_name || "o operador responsável"
        } pode enviar mensagens nesta conversa.`
      );
      return;
    }

    setIsTakingOver(true);
    authFetch(
      `${API_URL}/conversations/send_message/${selectedSession.session_id}?company_id=${user.company_id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: myMessage })
      }
    )
      .then(res => res.json())
      .then(data => {
        setMyMessage("");
        setMsg(data.message || data.detail || "Mensagem enviada.");
        fetchMensagens(selectedSession.session_id);
      })
      .finally(() => setIsTakingOver(false));
  }

  function renderMessage(m, idx) {
    const isEmployeeUser = (m.author === "Employee") || m.is_employee === true;
    const out = [];
    if (m.user_message) {
      out.push(
        <div key={`${idx}-user`} className="flex w-full mb-2 justify-start">
          <div className={`px-4 py-2 rounded-2xl shadow max-w-[70%] whitespace-pre-line
            ${isEmployeeUser ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-gray-200 text-gray-900"}`}>
            {m.user_message}
          </div>
        </div>
      );
    }
    if (m.response) {
      const isBot = m.author === "User" || m.author === "Employee";
      const isFaq = m.author === "FAQ";
      const isHuman = m.author === "Human";
      out.push(
        <div key={`${idx}-resp`} className="flex w-full mb-2 justify-end">
          <div
            className={`
              px-4 py-2 rounded-2xl shadow max-w-[70%] whitespace-pre-line
              ${isBot ? "bg-primary text-white" : ""}
              ${isHuman ? "bg-green-100 text-green-700 border border-green-300" : ""}
            `}
          >
            {isBot && <span>{m.response}</span>}
            {isFaq && (
              <div>
                <div className="font-bold mb-1">FAQ:</div>
                <div>{m.response}</div>
              </div>
            )}
            {isHuman && (
              <div>
                <div className="font-bold mb-1">{m.employee_name || "Operador"}:</div>
                <div>{m.response}</div>
              </div>
            )}
          </div>
        </div>
      );
    }
    return out;
  }

  function statusControle(session) {
    if (session.control === "human")
      return (
        <span className="text-green-700 font-semibold flex items-center">
          <FaUserCheck className="inline mr-1" />
          Operador{session.employee_name ? `: ${session.employee_name}` : ""}
        </span>
      );
    return (
      <span className="text-primary font-semibold">
        <FaRobot className="inline mr-1" />Operador: ChatBot
      </span>
    );
  }

  const limitReached =
    seatStatus &&
    Number.isFinite(Number(seatStatus.limit)) &&
    Number.isFinite(Number(seatStatus.in_use)) &&
    Number(seatStatus.limit) > 0 &&
    Number(seatStatus.in_use) >= Number(seatStatus.limit);

  const selfSessions = Number(seatStatus?.self_sessions || 0);
  const alreadyHoldingSeat = selfSessions > 0;
  const limitBlocksYou = limitReached && !alreadyHoldingSeat;

  const holderId = Number(
    selectedSession?.employee_id ?? selectedSession?.takeover_by ?? NaN
  );
  const isMine =
    selectedSession?.control === "human" && holderId === Number(user.id);
  const controlledByOther =
    selectedSession?.control === "human" && !isMine;

  const isEmployeeContact = useMemo(() => {
    if (selectedSession?.is_employee || selectedSession?.user_is_employee) return true;
    if (!mensagens || mensagens.length === 0) return false;
    return mensagens.some(mm => mm.user_message && ((mm.author === "Employee") || mm.is_employee === true));
  }, [selectedSession, mensagens]);

  return (
    <div className="flex h-[calc(100vh-80px)] bg-gray-50">
      <aside className="w-72 bg-white border-r h-full overflow-y-auto shadow flex-shrink-0">
        <div className="font-bold text-lg px-4 py-3 border-b bg-gray-200 flex items-center gap-2">
          <FaComments className="text-primary" /> Conversas Ativas
        </div>
        <div className="flex items-center justify-between px-4 mt-2 mb-1">
          {seatStatus && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${
                limitReached
                  ? "bg-red-100 text-red-700 border-red-300"
                  : "bg-green-100 text-green-700 border-green-300"
              }`}
              title="Operadores simultâneos em conversas"
            >
              {limitReached && <FaExclamationTriangle className="inline mr-1" />}
              Operadores em Atendimento: {Number(seatStatus.in_use)}/{Number(seatStatus.limit)}
            </span>
          )}
        </div>
          <ul>
            {conversas.map(conv => {
              const convIsEmployee = !!(conv.is_employee || conv.user_is_employee);
              const isSelected = selectedSession && selectedSession.session_id === conv.session_id;

              const baseItem = "px-4 py-3 cursor-pointer border-b flex items-center justify-between";
              const itemCls = convIsEmployee
                ? (isSelected ? `${baseItem} bg-amber-100 text-amber-800 border border-amber-200`
                              : `${baseItem} hover:bg-amber-50`)
                : (isSelected ? `${baseItem} bg-primary text-white`
                              : `${baseItem} hover:bg-gray-100`);

              const nameTextCls = isSelected
                ? (convIsEmployee ? "text-amber-800" : "text-white")
                : (convIsEmployee ? "text-amber-800" : "text-primary");

              const phoneTextCls = isSelected
                ? (convIsEmployee ? "text-amber-800" : "text-purple-200")
                : (convIsEmployee ? "text-amber-800" : "text-gray-700");

              return (
                <li
                  key={conv.session_id}
                  className={itemCls}
                  onClick={() => handleSelect(conv)}
                >
                  <div>
                    <div className={`font-bold text-base flex items-center gap-2 ${nameTextCls}`}>
                      <FaUser className="inline mr-1" />
                      {conv.user_name || "Sem nome"}{convIsEmployee ? " (Colaborador)" : ""}
                    </div>

                    <div className={`text-xs ml-6 ${phoneTextCls}`}>
                      {conv.user_phone}
                    </div>

                    <div className="text-xs">{statusControle(conv)}</div>
                  </div>
                  <FaChevronRight />
                </li>
              );
            })}
            {conversas.length === 0 && <li className="p-4 text-gray-500">Nenhuma conversa ativa.</li>}
          </ul>
      </aside>

      <main className="flex-1 flex flex-col h-full relative">
        {!selectedSession ? (
          <div className="flex flex-1 items-center justify-center text-gray-400">
            <FaComments className="text-4xl mr-2" /> Selecione uma conversa para visualizar.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between bg-white border-b px-6 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <button className="md:hidden" onClick={() => setSelectedSession(null)}>
                  <FaArrowLeft />
                </button>
                <span className="font-bold text-xl">
                  {selectedSession.user_name || "Sem nome"}{isEmployeeContact ? " (Colaborador)" : ""}
                </span>
                {isEmployeeContact && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300">
                    Colaborador
                  </span>
                )}
                <span className="ml-2 text-sm text-gray-400">{selectedSession.user_phone}</span>
                <span className="ml-4">{statusControle(selectedSession)}</span>
              </div>
              <div className="flex items-center gap-3">
                {seatStatus && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${
                      limitReached
                        ? "bg-red-100 text-red-700 border-red-300"
                        : "bg-green-100 text-green-700 border-green-300"
                    }`}
                    title="Operadores simultâneos em conversas"
                  >
                    {limitReached && <FaExclamationTriangle className="inline mr-1" />}
                    Operadores: {Number(seatStatus.in_use)}/{Number(seatStatus.limit)}
                  </span>
                )}
                {selectedSession.control !== "human" ? (
                  <button
                    className={`px-4 py-1 rounded-lg font-bold shadow transition
                      ${limitBlocksYou ? "bg-red-600 text-white hover:bg-gray-500"
                                      : "bg-green-600 text-white hover:bg-green-700"}`}
                    onClick={takeover}
                    disabled={isTakingOver}
                    title={
                      limitBlocksYou
                        ? "Limite de Operadores em atendimento atingido!"
                        : (alreadyHoldingSeat
                            ? "Você já está em atendimento e pode assumir outra conversa."
                            : "Assumir controle")
                    }
                  >
                    Assumir controle
                  </button>
                ) : (
                  <button
                    className="bg-primary text-white px-4 py-1 rounded-lg font-bold shadow hover:bg-purple-700 transition"
                    onClick={returnToBot}
                    disabled={isTakingOver}
                  >
                    Devolver ao Bot
                  </button>
                )}
              </div>
            </div>

            {controlledByOther && (
              <div className="px-6 py-2 bg-red-700 text-white text-sm">
                A conversa está em atendimento por <strong>{selectedSession.employee_name || "outro operador"}</strong>. Você pode apenas acompanhar.
              </div>
            )}

            {isEmployeeContact && (
              <div className="px-6 py-2 bg-amber-300 text-amber-800 border border-amber-200 text-sm">
                O usuário desta conversa é um <strong>Colaborador</strong> da empresa.
              </div>
            )}

            <div className={`flex-1 p-6 overflow-y-auto flex flex-col ${isEmployeeContact ? "bg-amber-50" : ""}`}>
              {mensagens.length === 0 && <div className="text-gray-400">Nenhuma mensagem nesta conversa ainda.</div>}
              {mensagens.flatMap(renderMessage)}
            </div>

            {selectedSession.control === "human" && (
              <form onSubmit={sendHumanMessage} className="flex gap-2 p-4 bg-white border-t">
                <input
                  type="text"
                  className="flex-1 border rounded px-4 py-2"
                  placeholder={
                    controlledByOther
                      ? `Somente ${selectedSession.employee_name || "o operador responsável"} pode responder...`
                      : "Digite sua mensagem..."
                  }
                  value={myMessage}
                  onChange={e => setMyMessage(e.target.value)}
                  disabled={isTakingOver || controlledByOther}
                />
                <button
                  type="submit"
                  className={`px-6 py-2 rounded-lg font-bold shadow transition
                    ${controlledByOther ? "bg-gray-300 text-gray-600 hover:bg-gray-300" : "bg-green-600 text-white hover:bg-green-700"}`}
                  disabled={isTakingOver || controlledByOther}
                  title={controlledByOther ? "Apenas o operador que assumiu pode enviar mensagens." : "Enviar"}
                >
                  Enviar
                </button>
              </form>
            )}

            {msg && (
              <div className={`fixed bottom-6 right-6 ${limitBlocksYou ? "bg-red-600": "bg-primary"} border border-gray-200 text-white px-4 py-2 rounded shadow`}>
                {msg}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
