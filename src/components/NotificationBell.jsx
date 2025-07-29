import React from "react";
import { useEffect, useState, useRef } from "react";
import { authFetch } from "../utils/authFetch";
import { useAuth } from "../utils/authData";
import { Bell } from "lucide-react";
import clsx from "clsx";

export default function NotificationBell() {
  const { user } = useAuth();
  const COMPANY_ID = user?.company_id;
  const API_URL = import.meta.env.VITE_API_URL;
  const [events, setEvents] = useState([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef();
  const [animate, setAnimate] = useState(false);

  // Busca eventos não vistos
  useEffect(() => {
    if (!COMPANY_ID) return;
    const fetchEvents = () => {
      authFetch(`${API_URL}/admin/events?company_id=${COMPANY_ID}&viewed=false`)
        .then(res => res.json())
        .then(data => setEvents(Array.isArray(data) ? data : []));
    };
    fetchEvents();
    const interval = setInterval(fetchEvents, 10000);
    return () => clearInterval(interval);
  }, [COMPANY_ID]);

  useEffect(() => {
    if (events.length > 0) {
      setAnimate(true);
      const timeout = setTimeout(() => setAnimate(false), 5000);
      return () => clearTimeout(timeout);
    }
  }, [events.length]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Marcar evento como lido
  const handleView = (eventId) => {
    authFetch(`${API_URL}/admin/events/${eventId}/view`, { method: "POST" })
      .then(() => setEvents(events.filter(e => e.id !== eventId)));
  };

  // Marcar todos como lidos
  const handleViewAll = () => {
    Promise.all(events.map(ev =>
      authFetch(`${API_URL}/admin/events/${ev.id}/view`, { method: "POST" })
    )).then(() => setEvents([]));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-primary/10 transition ${animate ? "animate-shake" : ""}`}
        aria-label="Notificações"
      >
        <Bell className="w-6 h-6 text-white" />
        {events.length > 0 && (
          <span className={clsx("absolute top-0 right-0 w-3 h-3 rounded-full border-2 border-white bg-red-500 animate-pulse")}></span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 bg-white shadow-lg rounded-lg p-3 border">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-base">Notificações</span>
            {events.length > 0 && (
              <button className="text-xs text-primary hover:underline" onClick={handleViewAll}>
                Marcar todas como lidas
              </button>
            )}
          </div>
          <ul className="max-h-64 overflow-y-auto">
            {events.length === 0 && (
              <li className="text-gray-500 py-6 text-center">Nenhuma notificação no momento.</li>
            )}
            {events.map(event => (
              <li
                key={event.id}
                className="border-b last:border-b-0 py-2 flex items-start gap-2"
              >
                <span className="block w-2 h-2 mt-2 rounded-full bg-primary"></span>
                <div className="flex-1">
                  <div className="font-semibold text-primary">
                    {event.type === "request_attendant" && "Solicitação de atendente"}
                    {event.type === "irrelevant_streak" && "Mensagens irrelevantes"}
                    {event.type === "long_conversation" && "Conversa longa"}
                  </div>
                  <div className="text-xs text-gray-700 mb-1">
                    <b>{event.user_name || "Usuário"} ({event.user_phone})</b>
                  </div>
                  <div className="text-xs text-gray-700 mb-1">{event.message}</div>
                  <div className="text-[10px] text-primary">
                    <b>{new Date(event.created_at).toLocaleString("pt-BR")}</b>
                  </div>
                </div>
                <button
                  onClick={() => handleView(event.id)}
                  className="ml-2 text-xs text-primary underline"
                >
                  Lida
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
