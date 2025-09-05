// src/pages/RealTimeMessagesPage.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useAuth } from "../utils/authData";
import { authFetch } from "../utils/authFetch";
import {
  FaUser,
  FaComments,
  FaRobot,
  FaUserCheck,
  FaChevronRight,
  FaArrowLeft,
  FaExclamationTriangle,
  FaCheck
} from "react-icons/fa";
import { useLocation } from "react-router-dom";
import DateFilters from "../components/DateFilters";

/* helpers */
const norm = (s) =>
  (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

function getHolderId(s) {
  const cands = [s?.takeover_by, s?.holder_id, s?.employee_id];
  for (const v of cands) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function lastHumanIdFromMessages(msgs) {
  for (let i = msgs.length - 1; i >= 0; i--) {
    const id = Number(msgs[i]?.employee_id);
    if (Number.isFinite(id)) return id;
  }
  return null;
}

function isMineSession(session, user, msgs) {
  if (!session || session.control !== "human") return false;
  const holderId = getHolderId(session);
  const lastHumanId = lastHumanIdFromMessages(msgs || []);
  const nameMatch = norm(session.employee_name) === norm(user.name);
  return (
    holderId === Number(user.id) ||
    lastHumanId === Number(user.id) ||
    nameMatch
  );
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function fmtTimeLabel(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  if (isSameDay(d, now)) return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

function fmtShortDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(
    d.getFullYear()
  ).slice(-2)}`;
}

/* novo: HH:mm para carimbo embaixo da bolha */
function fmtHourMin(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function RealTimeMessagesPage() {
  const { user } = useAuth();
  const location = useLocation();

  const [sessions, setSessions] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [messagesMap, setMessagesMap] = useState({});
  const [loadedSessionIds, setLoadedSessionIds] = useState([]);

  const [msg, setMsg] = useState("");
  const [myMessage, setMyMessage] = useState("");
  const [isTakingOver, setIsTakingOver] = useState(false);
  const [initialPhone, setInitialPhone] = useState(null);

  const [seatStatus, setSeatStatus] = useState(null);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");

  const [filters, setFilters] = useState(() => {
    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    const startDt = new Date(now);
    startDt.setMonth(startDt.getMonth() - 1);
    const start = startDt.toISOString().slice(0, 10);
    return { start, end };
  });

  const pollingRef = useRef();
  const scrollRef = useRef(null);
  const messagesReqSeq = useRef(0);

  // ancora pra preservar a posição ao carregar anterior
  const anchorBottomDistRef = useRef(null);
  // rolar pro fim quando necessário (enviar msg / selecionar contato)
  const scrollToBottomNextRef = useRef(false);

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const phone = sp.get("phone");
    setInitialPhone(phone || null);
  }, [location.search]);

  function buildSessionsQS() {
    const p = new URLSearchParams({
      company_id: String(user.company_id),
      status,
      start_date: filters.start,
      end_date: filters.end
    });
    if (q && q.trim()) p.set("q", q.trim());
    return p.toString();
  }

  function fetchSessions() {
    authFetch(`${API_URL}/conversations/sessions?${buildSessionsQS()}`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data.conversations) ? data.conversations : [];
        setSessions(list);
      })
      .catch(() => {});
  }

  function fetchSeatStatus() {
    authFetch(
      `${API_URL}/conversations/live_attendants/status?company_id=${user.company_id}&human_id=${user.id}`
    )
      .then((res) => res.json())
      .then((data) => setSeatStatus(data))
      .catch(() => {});
  }

  function fetchSessionMessagesToMap(session_id) {
    const mySeq = ++messagesReqSeq.current;
    return authFetch(
      `${API_URL}/conversations/session/${session_id}?company_id=${user.company_id}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (mySeq !== messagesReqSeq.current) return;
        setMessagesMap((prev) => ({ ...prev, [session_id]: data.messages || [] }));
      })
      .catch(() => {});
  }

  useEffect(() => {
    fetchSessions();
    fetchSeatStatus();
    const id = setInterval(() => {
      fetchSessions();
      fetchSeatStatus();
      const active = selectedContact?.sessions.find((s) => s.status === "Ativa");
      if (active && loadedSessionIds.includes(active.session_id)) {
        fetchSessionMessagesToMap(active.session_id);
      }
    }, 3000);
    pollingRef.current = id;
    return () => clearInterval(id);
  }, [status, filters.start, filters.end, q, selectedPhone, loadedSessionIds.length]);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 3500);
    return () => clearTimeout(t);
  }, [msg]);

  const contacts = useMemo(() => {
    const map = new Map();
    for (const s of sessions) {
      const phone = s.user_phone || `unknown-${s.session_id}`;
      if (!map.has(phone)) {
        map.set(phone, {
          phone,
          name: s.user_name || "Sem nome",
          last_at: s.last_at,
          last_message: s.last_message,
          is_employee: !!(s.is_employee || s.user_is_employee),
          sessions: []
        });
      }
      const g = map.get(phone);
      g.sessions.push({
        session_id: s.session_id,
        status: s.status,
        control: s.control,
        last_at: s.last_at,
        last_message: s.last_message,
        started_at: s.started_at,
        ended_at: s.ended_at,
        employee_name: s.employee_name,
        is_employee: !!(s.is_employee || s.user_is_employee)
      });
      if (new Date(s.last_at) > new Date(g.last_at || 0)) {
        g.last_at = s.last_at;
        g.last_message = s.last_message;
        g.name = s.user_name || g.name;
        g.is_employee = g.is_employee || !!(s.is_employee || s.user_is_employee);
      }
    }
    for (const g of map.values()) {
      g.sessions.sort((a, b) => new Date(b.last_at) - new Date(a.last_at));
    }
    let arr = Array.from(map.values());
    arr = arr.filter((c) => {
      const hasActive = c.sessions.some((x) => x.status === "Ativa");
      if (status === "active") return hasActive;
      if (status === "closed") return !hasActive;
      return true;
    });
    const txt = q.trim().toLowerCase();
    if (txt) {
      arr = arr.filter((c) => {
        const ids = c.sessions.map((s) => s.session_id).join(" ");
        const hay = `${c.name || ""} ${c.phone || ""} ${ids}`.toLowerCase();
        return hay.includes(txt);
      });
    }
    arr.sort((a, b) => new Date(b.last_at) - new Date(a.last_at));
    return arr;
  }, [sessions, status, q]);

  const selectedContact = useMemo(
    () => contacts.find((c) => c.phone === selectedPhone) || null,
    [contacts, selectedPhone]
  );

  useEffect(() => {
    if (!initialPhone || selectedPhone || contacts.length === 0) return;
    const target = contacts.find((c) =>
      String(c.phone || "").includes(String(initialPhone))
    );
    if (target) handleSelectContact(target.phone);
  }, [initialPhone, contacts, selectedPhone]);

  // pós-atualização do DOM: aplicar ancora / rolar pro fim quando necessário
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (anchorBottomDistRef.current != null) {
      el.scrollTop = el.scrollHeight - anchorBottomDistRef.current;
      anchorBottomDistRef.current = null;
      return;
    }
    if (scrollToBottomNextRef.current) {
      el.scrollTop = el.scrollHeight;
      scrollToBottomNextRef.current = false;
    }
  }, [messagesMap, loadedSessionIds.length, selectedPhone]);

  function handleSelectContact(phone) {
    setSelectedPhone(phone);
    setMessagesMap({});
    setLoadedSessionIds([]);
    const c = contacts.find((x) => x.phone === phone);
    if (c && c.sessions.length > 0) {
      const firstId = c.sessions[0].session_id; // mais recente
      setLoadedSessionIds([firstId]);
      fetchSessionMessagesToMap(firstId);
      scrollToBottomNextRef.current = true;
    }
  }

  function loadMoreSessions(n = 1) {
    if (!selectedContact) return;

    // ancora: mantém a visão atual (não "sobe" automaticamente)
    const el = scrollRef.current;
    if (el) {
      anchorBottomDistRef.current = el.scrollHeight - el.scrollTop;
    }

    const remaining = selectedContact.sessions.filter(
      (s) => !loadedSessionIds.includes(s.session_id)
    );
    // carrega a(s) próxima(s) conversa(s) ANTERIOR(ES)
    const toLoad = remaining.slice(0, n);
    if (toLoad.length === 0) return;

    setLoadedSessionIds((prev) => [...prev, ...toLoad.map((t) => t.session_id)]);
    toLoad.forEach((t) => fetchSessionMessagesToMap(t.session_id));
  }

  // blocos em ordem cronológica ASC (antigas em cima, recentes embaixo)
  const combinedMessages = useMemo(() => {
    if (!selectedContact) return [];
    const blocks = [];
    const sessionsAsc = [...selectedContact.sessions].reverse();
    for (const s of sessionsAsc) {
      if (!loadedSessionIds.includes(s.session_id)) continue;
      blocks.push({ type: "sep", session: s });
      const msgs = messagesMap[s.session_id] || [];
      for (const m of msgs) {
        blocks.push({ type: "msg", session: s, payload: m });
      }
    }
    return blocks;
  }, [selectedContact, loadedSessionIds, messagesMap]);

  const activeSession =
    selectedContact?.sessions.find((s) => s.status === "Ativa") || null;
  const activeSessionMsgs = activeSession
    ? messagesMap[activeSession.session_id] || []
    : [];
  const mine = activeSession
    ? isMineSession(activeSession, user, activeSessionMsgs)
    : false;

  async function takeover() {
    if (!activeSession) {
      setMsg("Este contato não possui conversa ativa no momento.");
      return;
    }
    setIsTakingOver(true);
    try {
      const pre = await authFetch(
        `${API_URL}/conversations/live_attendants/status?company_id=${user.company_id}&human_id=${user.id}`
      ).then((r) => r.json());
      setSeatStatus(pre);
      if (pre && pre.can_take === false && pre.reason === "limit-reached") {
        setMsg(
          `Limite de Operadores atingido (${pre.in_use}/${pre.limit}). Aguarde alguém devolver ao bot.`
        );
        return;
      }
      const data = await authFetch(
        `${API_URL}/conversations/chatbot/takeover/${activeSession.session_id}?human_id=${user.id}&company_id=${user.company_id}`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      ).then((r) => r.json());
      if (data?.detail) {
        setMsg(data.detail);
      } else {
        setMsg("Você assumiu o controle da conversa.");
        fetchSessions();
        fetchSeatStatus();
        if (!loadedSessionIds.includes(activeSession.session_id)) {
          setLoadedSessionIds((prev) => [...prev, activeSession.session_id]);
          fetchSessionMessagesToMap(activeSession.session_id);
        }
      }
    } catch {
      setMsg("Não foi possível assumir o controle no momento.");
    } finally {
      setIsTakingOver(false);
    }
  }

  function returnToBot() {
    if (!activeSession) {
      setMsg("Este contato não possui conversa ativa.");
      return;
    }
    if (!mine) {
      setMsg(
        `Apenas ${
          activeSession.employee_name || "o operador responsável"
        } pode devolver ao bot.`
      );
      return;
    }
    setIsTakingOver(true);
    authFetch(
      `${API_URL}/conversations/chatbot/takeback/${activeSession.session_id}?company_id=${user.company_id}`,
      { method: "POST" }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data?.detail) setMsg(data.detail);
        else setMsg("Controle devolvido ao bot.");
        fetchSessions();
        fetchSeatStatus();
      })
      .finally(() => setIsTakingOver(false));
  }

  function sendHumanMessage(e) {
    e.preventDefault();
    if (!myMessage.trim()) return;
    if (!activeSession) {
      setMsg("Este contato não possui conversa ativa.");
      return;
    }
    if (!mine) {
      setMsg(
        `Somente ${
          activeSession.employee_name || "o operador responsável"
        } pode enviar mensagens nesta conversa.`
      );
      return;
    }
    setIsTakingOver(true);
    authFetch(
      `${API_URL}/conversations/send_message/${activeSession.session_id}?company_id=${user.company_id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: myMessage })
      }
    )
      .then((res) => res.json())
      .then((data) => {
        setMyMessage("");
        setMsg(data.message || data.detail || "Mensagem enviada.");
        fetchSessionMessagesToMap(activeSession.session_id);
        scrollToBottomNextRef.current = true;
      })
      .finally(() => setIsTakingOver(false));
  }

  /* >>> timestamps sob cada bolha (cinza, pequeno) <<< */
  function renderMessage(m, idx) {
    const isEmployeeUser =
      m.payload.author === "Employee" || m.payload.is_employee === true;
    const time = fmtHourMin(m.payload.created_at);
    const out = [];

    if (m.payload.user_message) {
      out.push(
        <div key={`${idx}-user`} className="flex w-full mb-1.5 justify-start">
          <div className="inline-flex flex-col items-start max-w-[70%]">
            <div
              className={`px-3 py-1.5 rounded-2xl shadow whitespace-pre-line break-words break-all text-[13px]
              ${
                isEmployeeUser
                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                  : "bg-gray-200 text-gray-900"
              }`}
            >
              {m.payload.user_message}
            </div>
            <div className="mt-0.5 text-[10px] text-gray-500">{time}</div>
          </div>
        </div>
      );
    }

    if (m.payload.response) {
      const isBot = m.payload.author === "User" || m.payload.author === "Employee" || m.payload.author === "Bot"; //Bot é author legado, mas mantemos por compatibilidade
      const isFaq = m.payload.author === "FAQ";
      const isHuman = m.payload.author === "Human";
      out.push(
        <div key={`${idx}-resp`} className="flex w-full mb-1.5 justify-end">
          <div className="inline-flex flex-col items-end max-w-[70%]">
            <div
              className={`
                px-3 py-1.5 rounded-2xl shadow whitespace-pre-line break-words break-all text-[13px]
                ${isBot ? "bg-primary text-white" : ""}
                ${isHuman ? "bg-green-100 text-green-700 border border-green-300" : ""}
              `}
            >
              {isBot && <span>{m.payload.response}</span>}
              {isFaq && (
                <div>
                  <div className="font-semibold text-[12px] mb-0.5">FAQ:</div>
                  <div>{m.payload.response}</div>
                </div>
              )}
              {isHuman && (
                <div>
                  <div className="font-semibold text-[12px] mb-0.5">
                    {m.payload.employee_name || "Operador"}:
                  </div>
                  <div>{m.payload.response}</div>
                </div>
              )}
            </div>
            <div className="mt-0.5 text-[10px] text-gray-500">{time}</div>
          </div>
        </div>
      );
    }
    return out;
  }

  function statusChipForActive() {
    if (!activeSession) return null;
    if (activeSession.control === "human")
      return (
        <span className="text-green-700 font-semibold flex items-center text-sm">
          <FaUserCheck className="inline mr-1" />
          Operador{activeSession.employee_name ? `: ${activeSession.employee_name}` : ""}
        </span>
      );
    return (
      <span className="text-primary font-semibold text-sm">
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

  const alreadyHoldingSeat = Number(seatStatus?.self_sessions || 0) > 0;
  const limitBlocksYou = limitReached && !alreadyHoldingSeat;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-gray-50 text-[13px]">
      <div className="bg-white border-b shadow-sm px-6 py-2.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
          <DateFilters
            value={{ start: filters.start, end: filters.end }}
            onApply={(v) => setFilters({ start: v.start, end: v.end })}
            includePhone={false}
          />
          {seatStatus && (
            <div className="flex items-center text-center gap-2">
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full border ${
                  limitReached
                    ? "bg-red-100 text-red-700 border-red-300"
                    : "bg-green-100 text-green-700 border-green-300"
                }`}
                title="Operadores simultâneos em conversas"
              >
                {limitReached && <FaExclamationTriangle className="inline mr-1" />}
                Operadores: {Number(seatStatus.in_use)}/{Number(seatStatus.limit)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Lista de contatos */}
        <aside className="w-80 bg-white border-r h-full overflow-y-auto shadow flex-shrink-0">
          <div className="font-bold text-base px-4 py-2.5 border-b bg-gray-200 flex items-center gap-2">
            <FaComments className="text-primary" /> Contatos
          </div>

          <div className="p-3 border-b">
            <div className="inline-flex rounded-lg overflow-hidden border mb-2">
              {["all", "active", "closed"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-2.5 py-1 text-xs ${
                    status === s ? "bg-primary text-white" : "bg-white text-gray-700"
                  }`}
                  title={
                    s === "all" ? "Todos os contatos" : s === "active" ? "Com conversa ativa" : "Somente finalizados"
                  }
                >
                  {s === "all" ? "Todos" : s === "active" ? "Ativos" : "Finalizados"}
                </button>
              ))}
            </div>

            <input
              className="w-full border rounded px-3 py-1.5 text-sm"
              placeholder="Filtrar por nome ou telefone"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <ul>
            {contacts.map((c) => {
              const isSelected = selectedPhone === c.phone;
              const hasActive = c.sessions.some((s) => s.status === "Ativa");

              const baseItem =
                "px-4 py-2.5 cursor-pointer border-b flex items-center justify-between";
              const itemCls = isSelected
                ? `${baseItem} bg-primary text-white`
                : `${baseItem} hover:bg-gray-100`;

              const nameCls = isSelected
                ? "text-white"
                : c.is_employee
                ? "text-amber-800"
                : "text-primary";
              const phoneCls = isSelected
                ? "text-purple-200"
                : c.is_employee
                ? "text-amber-800"
                : "text-gray-700";

              return (
                <li
                  key={c.phone}
                  className={itemCls}
                  onClick={() => handleSelectContact(c.phone)}
                >
                  <div className="min-w-0 flex-1">
                    <div className={`font-semibold text-sm flex items-center gap-2 ${nameCls}`}>
                      <FaUser className="inline mr-1" />
                      <span className="truncate">{c.name || "Sem nome"}</span>
                      {c.is_employee && (
                        <span className="ml-1 text-[10px] font-semibold text-amber-700">
                          (Colaborador)
                        </span>
                      )}
                    </div>

                    <div className={`text-[12px] ml-6 flex items-center gap-2 ${phoneCls}`}>
                      <span>{c.phone}</span>
                      {hasActive && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-300">
                          Ativa
                        </span>
                      )}
                    </div>

                    <div className="ml-6 mt-1 flex items-center gap-1 text-[11px] text-gray-500 min-w-0">
                      <FaCheck className="shrink-0 text-gray-400" />
                      <span className="truncate">
                        {(c.last_message || "-").toString().replace(/\s+/g, " ").trim()}
                      </span>
                    </div>
                  </div>

                  <div className="pl-2 flex flex-col items-end justify-between self-stretch">
                    <span className="text-[10px] text-gray-400">{fmtTimeLabel(c.last_at)}</span>
                    <FaChevronRight className="text-gray-400 mt-1.5" />
                  </div>
                </li>
              );
            })}
            {contacts.length === 0 && (
              <li className="p-4 text-gray-500 text-sm">Nenhum contato neste filtro.</li>
            )}
          </ul>
        </aside>

        {/* Painel de mensagens */}
        <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
          {!selectedContact ? (
            <div className="flex flex-1 items-center justify-center text-gray-400">
              <FaComments className="text-3xl mr-2" /> Selecione um contato para visualizar.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between bg-white border-b px-6 py-2.5 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <button className="md:hidden" onClick={() => setSelectedPhone(null)}>
                    <FaArrowLeft />
                  </button>
                  <span className="font-bold text-lg">
                    {selectedContact.name || "Sem nome"}
                    {selectedContact.is_employee ? " (Colaborador)" : ""}
                  </span>
                  {selectedContact.is_employee && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300">
                      Colaborador
                    </span>
                  )}
                  <span className="ml-2 text-[12px] text-gray-400">{selectedContact.phone}</span>
                  <span className="ml-4">{statusChipForActive()}</span>
                </div>

                <div className="flex items-center gap-2.5">
                  {activeSession && activeSession.control !== "human" && (
                    <button
                      className={`px-3.5 py-1 rounded-lg font-bold shadow transition text-sm ${
                        limitBlocksYou
                          ? "bg-red-600 text-white hover:bg-gray-500"
                          : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                      onClick={takeover}
                      disabled={isTakingOver}
                      title={
                        limitBlocksYou
                          ? "Limite de Operadores em atendimento atingido!"
                          : "Assumir controle"
                      }
                    >
                      Assumir controle
                    </button>
                  )}
                  {activeSession && activeSession.control === "human" && (
                    <button
                      className={`px-3.5 py-1 rounded-lg font-bold shadow transition text-sm ${
                        isMineSession(activeSession, user, activeSessionMsgs)
                          ? "bg-primary text-white hover:bg-purple-700"
                          : "bg-gray-300 text-gray-600 cursor-not-allowed"
                      }`}
                      onClick={
                        isMineSession(activeSession, user, activeSessionMsgs)
                          ? returnToBot
                          : undefined
                      }
                      disabled={isTakingOver || !isMineSession(activeSession, user, activeSessionMsgs)}
                      aria-disabled={!isMineSession(activeSession, user, activeSessionMsgs)}
                    >
                      Devolver ao Bot
                    </button>
                  )}
                </div>
              </div>

              <div
                ref={scrollRef}
                className={`flex-1 min-h-0 p-4 overflow-y-auto flex flex-col ${
                  selectedContact.is_employee ? "bg-amber-50" : ""
                }`}
              >
                {/* Botão no TOPO para carregar anteriores (mantendo posição) */}
                {selectedContact &&
                  loadedSessionIds.length < selectedContact.sessions.length && (
                    <div className="flex justify-center mb-3">
                      <button
                        className="text-[12px] px-3 py-0.5 rounded border border-gray-300 hover:bg-gray-50"
                        onClick={() => loadMoreSessions(1)}
                      >
                        Carregar conversa anterior
                      </button>
                    </div>
                  )}

                {combinedMessages.length === 0 && (
                  <div className="text-gray-400 text-sm">Carregando mensagens…</div>
                )}

                {combinedMessages.map((item, idx) => {
                  if (item.type === "sep") {
                    return (
                      <div
                        key={`sep-${item.session.session_id}`}
                        className="my-4 flex items-center gap-3 text-primary"
                      >
                        <span className="h-px bg-primary/50 flex-1 rounded" />
                        <span className="text-[12px] font-semibold">
                          Sessão #{item.session.session_id} —{" "}
                          {fmtShortDate(item.session.last_at || item.session.started_at)}
                        </span>
                        <span className="h-px bg-primary/50 flex-1 rounded" />
                      </div>
                    );
                  }
                  return (
                    <React.Fragment key={`msg-${idx}`}>
                      {renderMessage(item, idx)}
                    </React.Fragment>
                  );
                })}
              </div>

              {activeSession && activeSession.control === "human" && (
                <form onSubmit={sendHumanMessage} className="flex gap-2 p-3 bg-white border-t">
                  <input
                    type="text"
                    className="flex-1 border rounded px-3 py-1.5 text-[13px]"
                    placeholder={
                      isMineSession(activeSession, user, activeSessionMsgs)
                        ? "Digite sua mensagem..."
                        : `Somente ${
                            activeSession.employee_name || "o operador responsável"
                          } pode responder...`
                    }
                    value={myMessage}
                    onChange={(e) => setMyMessage(e.target.value)}
                    disabled={isTakingOver || !isMineSession(activeSession, user, activeSessionMsgs)}
                  />
                  <button
                    type="submit"
                    className={`px-5 py-1.5 rounded-lg font-bold shadow transition text-sm ${
                      isMineSession(activeSession, user, activeSessionMsgs)
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-gray-300 text-gray-600"
                    }`}
                    disabled={isTakingOver || !isMineSession(activeSession, user, activeSessionMsgs)}
                  >
                    Enviar
                  </button>
                </form>
              )}

              {msg && (
                <div
                  className={`fixed bottom-6 right-6 ${
                    limitBlocksYou ? "bg-red-600" : "bg-primary"
                  } border border-gray-200 text-white px-3.5 py-2 rounded shadow text-sm`}
                >
                  {msg}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
