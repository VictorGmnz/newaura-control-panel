import React from "react";
import NotificationBell from "./NotificationBell";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between px-4 md:px-8 py-3 bg-[#5A2EBB] shadow w-full fixed top-0 left-0 z-20 h-24 ">
      <div className="flex items-center gap-12 ml-2">
        <img
          src="/logo-sem-fundo.png"
          alt="Logo New Aura AI"
          className="h-16 w-36 object-cover rounded-xl mr-2 cursor-pointer"
          onClick={() => navigate("/")}
          style={{ transition: "transform 0.2s" }}
          onMouseOver={e => (e.currentTarget.style.transform = "scale(1.08)")}
          onMouseOut={e => (e.currentTarget.style.transform = "scale(1)")}
        />
        <div>
          <span className="font-bold text-lg text-white">Painel New Aura AI</span>
          <div className="text-xs text-gray-200 -mt-1">Soluções digitais com IA e WhatsApp</div>
        </div>
      </div>
        <div className="flex items-center gap-5">
            <NotificationBell />
        </div>
    </header>
  );
}
