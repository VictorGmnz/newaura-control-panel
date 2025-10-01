import React, { useEffect, useState, useRef } from "react";
import { authFetch } from "../utils/authFetch";
import { useAuth } from "../utils/authData";
import { Bell } from "lucide-react";
import clsx from "clsx";
import { useNavigate } from "react-router-dom";

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const COMPANY_ID = user?.company_id;
  const API_URL = import.meta.env.VITE_API_URL;

  const [events, setEvents] = useState([]);
  const [open, setOpen] = useState(false);
  const [animate, setAnimate] = useState(false);

  const dropdownRef = useRef();
  const prevIdsRef = useRef(new Set());
  const audioCtxRef = useRef(null);
  const animateTimeoutRef = useRef(null);
  const pollRef = useRef(null);

  function playChime() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const now = ctx.currentTime;
      const notes = [1046.5, 1318.5];
      const arpegioStep = 0.06;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 3200;
      lp.Q.value = 0.7;
      lp.connect(ctx.destination);
      notes.forEach((f, i) => {
        const startAt = now + i * arpegioStep;
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, startAt);
        const oscH = ctx.createOscillator();
        oscH.type = "sine";
        oscH.frequency.setValueAtTime(f * 2, startAt);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, startAt);
        g.gain.exponentialRampToValueAtTime(0.08, startAt + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.28);
        const gH = ctx.createGain();
        gH.gain.setValueAtTime(0.0001, startAt);
        gH.gain.exponentialRampToValueAtTime(0.02, startAt + 0.02);
        gH.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.24);
        osc.connect(g);   g.connect(lp);
        oscH.connect(gH); gH.connect(lp);
        osc.start(startAt);
        osc.stop(startAt + 0.5);
        oscH.start(startAt);
        oscH.stop(startAt + 0.46);
        const dly = ctx.createDelay();
        dly.delayTime.value = 0.18;
        const gD = ctx.createGain();
        gD.gain.value = 0.18;
        const send = ctx.createGain();
        send.gain.value = 0.5;
        g.connect(send);
        gH.connect(send);
        send.connect(dly);
        dly.connect(gD);
        gD.connect(lp);
      });
    } catch (_) {}
  }

  useEffect(() => {
    if (!COMPANY_ID) return;
    let mounted = true;

    const fetchEvents = async () => {
      try {
        const res = await authFetch(`${API_URL}/admin/events?company_id=${COMPANY_ID}&viewed=false`);
        const data = await res.json();
        const incoming = Array.isArray(data) ? data : [];
        const curr = new Set(incoming.map(e => e.id));
        let newCount = 0;
        curr.forEach(id => { if (!prevIdsRef.current.has(id)) newCount++; });
        prevIdsRef.current = curr;
        if (!mounted) return;
        setEvents(incoming);
        if (newCount > 0) {
          setAnimate(true);
          playChime();
          clearTimeout(animateTimeoutRef.current);
          animateTimeoutRef.current = setTimeout(() => setAnimate(false), 1200);
        }
      } catch {}
    };

    fetchEvents();
    pollRef.current = setInterval(fetchEvents, 15000);
    return () => {
      mounted = false;
      clearInterval(pollRef.current);
      clearTimeout(animateTimeoutRef.current);
    };
  }, [COMPANY_ID, API_URL]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleView = (eventId) => {
    authFetch(`${API_URL}/admin/events/${eventId}/view`, { method: "POST" })
      .then(() => {
        setEvents(prev => {
          const next = prev.filter(e => e.id !== eventId);
          prevIdsRef.current = new Set(next.map(e => e.id));
          return next;
        });
      })
      .catch(() => {});
  };

  const handleViewAll = () => {
    const list = [...events];
    Promise.all(list.map(ev => authFetch(`${API_URL}/admin/events/${ev.id}/view`, { method: "POST" })))
      .then(() => {
        setEvents([]);
        prevIdsRef.current = new Set();
      })
      .catch(() => {});
  };

  const openConversation = async (ev) => {
    const qs = new URLSearchParams();
    if (ev.user_phone) qs.set("phone", String(ev.user_phone));
    if (ev.message_id) qs.set("message_id", String(ev.message_id));
    const url = `/conversas?${qs.toString()}`;
    try {
      await authFetch(`${API_URL}/admin/events/${ev.id}/view`, { method: "POST" });
      setEvents(prev => {
        const next = prev.filter(e => e.id !== ev.id);
        prevIdsRef.current = new Set(next.map(e => e.id));
        return next;
      });
    } catch {}
    setOpen(false);
    navigate(url);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-primary/10 transition ${animate ? "animate-shake" : ""}`}
        aria-label="Notificações"
      >
        <Bell className="w-8 h-8 text-white" />
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
                className="border-b last:border-b-0 py-2 flex items-start gap-2 cursor-pointer hover:bg-gray-50 rounded"
                role="button"
                tabIndex={0}
                onClick={() => openConversation(event)}
                onKeyDown={(e) => { if (e.key === "Enter") openConversation(event); }}
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
                <div className="flex flex-col items-end gap-2 ml-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); openConversation(event); }}
                    className="text-xs text-primary underline"
                  >
                    Abrir conversa
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleView(event.id); }}
                    className="text-[11px] text-gray-600 hover:underline"
                  >
                    Marcar lida
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
