import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../utils/authData";
import { authFetch } from "../utils/authFetch";
import { FaUser, FaComments, FaRobot, FaUserCheck, FaChevronRight, FaSync, FaArrowLeft } from "react-icons/fa";

export default function RealTimeMessagesPage() {
  const { user } = useAuth();
  const [conversas, setConversas] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [msg, setMsg] = useState("");
  const [myMessage, setMyMessage] = useState("");
  const [isTakingOver, setIsTakingOver] = useState(false);
  const pollingRef = useRef();

  const API_URL = import.meta.env.VITE_API_URL;

  function fetchConversas() {
    authFetch(`${API_URL}/conversations/active/sessions?company_id=${user.company_id}`)
      .then(res => res.json())
      .then(data => {
        setConversas(data.conversations || [])
      });
  }

  function fetchMensagens(session_id) {
    if (!session_id) return;
    authFetch(`${API_URL}/conversations/session/${session_id}?company_id=${user.company_id}`)
      .then(res => res.json())
      .then(data => {
        setMensagens(data.messages || [])
      });
  }

  useEffect(() => {
    fetchConversas();
    pollingRef.current = setInterval(() => {
      fetchConversas();
      if (selectedSession) fetchMensagens(selectedSession.session_id);
    }, 3000);
    return () => clearInterval(pollingRef.current);
  }, [selectedSession]);

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

  function takeover() {
    setIsTakingOver(true);
    authFetch(`${API_URL}/conversations/chatbot/takeover/${selectedSession.session_id}?human_id=${user.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user.company_id)
    })
      .then(res => res.json())
      .then(data => {
        setMsg(data.message || "Você assumiu o controle da conversa.");
        refreshSelectedSession(selectedSession.session_id);
      })
      .finally(() => setIsTakingOver(false));
  }

  function returnToBot() {
    setIsTakingOver(true);
    authFetch(`${API_URL}/conversations/chatbot/takeback/${selectedSession.session_id}?company_id=${user.company_id}`, {
      method: "POST"
    })
      .then(res => res.json())
      .then(() => {
        setMsg("Controle devolvido ao bot.");
        refreshSelectedSession(selectedSession.session_id);
      })
      .finally(() => setIsTakingOver(false));
  }

  function sendHumanMessage(e) {
    e.preventDefault();
    if (!myMessage.trim()) return;
    setIsTakingOver(true);
    authFetch(`${API_URL}/conversations/send_message/${selectedSession.session_id}?company_id=${user.company_id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: myMessage })
    })
      .then(res => res.json())
      .then(data => {
        setMyMessage("");
        setMsg(data.message || "Mensagem enviada.")
      })
      .finally(() => setIsTakingOver(false));
  }

function renderMessage(msg, idx) {
  const items = [];
  if (msg.user_message) {
    items.push(
      <div
        key={`${idx}-user`}
        className="flex w-full mb-2 justify-start"
      >
        <div className="px-4 py-2 rounded-2xl shadow max-w-[70%] bg-gray-200 text-gray-900 whitespace-pre-line">
          {msg.user_message}
        </div>
      </div>
    );
  }

  if (msg.response) {
    const isBot = msg.author === "Bot";
    const isHuman = msg.author === "Human";
    items.push(
      <div
        key={`${idx}-resp`}
        className="flex w-full mb-2 justify-end"
      >
        <div className={`
          px-4 py-2 rounded-2xl shadow max-w-[70%] whitespace-pre-line
          ${isBot ? "bg-primary text-white" : ""}
          ${isHuman ? "bg-green-100 text-green-700 border border-green-300" : ""}
        `}>
          {isBot && <span>{msg.response}</span>}
          {isHuman && <span><FaUserCheck className="inline mr-1" />{msg.author || "Human"}: {msg.response}</span>}
        </div>
      </div>
    );
  }
  return items;
}

  function statusControle(session) {
    if (session.control === "human")
      return <span className="text-green-700 font-semibold"><FaUserCheck className="inline mr-1" />Humano</span>;
    return <span className="text-primary font-semibold"><FaRobot className="inline mr-1" />Bot</span>;
  }

  return (
    <div className="flex h-[calc(100vh-80px)] bg-gray-50">
      {/* Lista lateral */}
      <aside className="w-72 bg-white border-r h-full overflow-y-auto shadow flex-shrink-0">
        <div className="font-bold text-lg px-4 py-3 border-b bg-gray-200 flex items-center gap-2">
          <FaComments className="text-primary" /> Conversas Ativas
        </div>
        <button className="text-xs px-2 py-1 text-primary hover:underline ml-4 mt-2" onClick={fetchConversas}>
          <FaSync className="inline mr-1" /> Atualizar
        </button>
        <ul>
          {conversas.map(conv => (
            <li
              key={conv.session_id}
              className={`px-4 py-3 cursor-pointer border-b flex items-center justify-between
                ${selectedSession && selectedSession.session_id === conv.session_id ? "bg-primary text-white" : "hover:bg-gray-100"}`}
              onClick={() => handleSelect(conv)}
            >
              <div>
                <div className="font-semibold flex items-center gap-2">
                  <FaUser className="inline mr-1" />
                  {conv.user_phone}
                </div>
                <div className="text-xs">{statusControle(conv)}</div>
              </div>
              <FaChevronRight />
            </li>
          ))}
          {conversas.length === 0 && <li className="p-4 text-gray-500">Nenhuma conversa ativa.</li>}
        </ul>
      </aside>

      {/* Painel central de chat */}
      <main className="flex-1 flex flex-col h-full relative">
        {!selectedSession ? (
          <div className="flex flex-1 items-center justify-center text-gray-400">
            <FaComments className="text-4xl mr-2" /> Selecione uma conversa para visualizar.
          </div>
        ) : (
          <>
            {/* Barra superior */}
            <div className="flex items-center justify-between bg-white border-b px-6 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <button className="md:hidden" onClick={() => setSelectedSession(null)}>
                  <FaArrowLeft />
                </button>
                <span className="font-bold text-lg">{selectedSession.user_phone}</span>
                <span className="ml-4">{statusControle(selectedSession)}</span>
              </div>
              <div className="flex gap-2">
                {selectedSession.control !== "human" ? (
                  <button
                    className="bg-green-600 text-white px-4 py-1 rounded-lg font-bold shadow hover:bg-green-700 transition"
                    onClick={takeover}
                    disabled={isTakingOver}
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
            {/* Mensagens */}
            <div className="flex-1 p-6 overflow-y-auto flex flex-col">
              {mensagens.length === 0 && <div className="text-gray-400">Nenhuma mensagem nesta conversa ainda.</div>}
              {mensagens.map(renderMessage)}
            </div>
            {/* Input do humano */}
            {selectedSession.control === "human" && (
              <form
                onSubmit={sendHumanMessage}
                className="flex gap-2 p-4 bg-white border-t"
              >
                <input
                  type="text"
                  className="flex-1 border rounded px-4 py-2"
                  placeholder="Digite sua mensagem..."
                  value={myMessage}
                  onChange={e => setMyMessage(e.target.value)}
                  disabled={isTakingOver}
                />
                <button
                  type="submit"
                  className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-green-700 transition"
                  disabled={isTakingOver}
                >
                  Enviar
                </button>
              </form>
            )}
            {msg && <div className="fixed bottom-6 right-6 bg-green-100 text-green-700 px-4 py-2 rounded shadow">{msg}</div>}
          </>
        )}
      </main>
    </div>
  );
}
