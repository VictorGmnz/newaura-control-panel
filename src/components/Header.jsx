import React from "react";
import { FaBell } from "react-icons/fa";

export default function Header() {
  return (
    <header className="flex items-center justify-between px-4 md:px-8 py-3 bg-[#5A2EBB] shadow w-full">
    <div className="flex items-center gap-12 ml-2">
      <img src="/logo-sem-fundo.png" alt="Logo" className="h-16 w-36 object-cover rounded-xl mr-2"/>
      <div>
        <span className="font-bold text-lg text-white">Painel New Aura AI</span>
        <div className="text-xs text-gray-200 -mt-1">Soluções digitais com IA e WhatsApp</div>
      </div>
    </div>
      <div className="flex items-center gap-5">
        <button className="relative p-2 rounded-full hover:bg-[#6847c6] transition">
          <FaBell className="text-white text-lg" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full border border-white"></span>
        </button>
        <img
          src="https://ui-avatars.com/api/?name=Cliente&background=fff&color=5A2EBB"
          alt="Avatar"
          className="w-9 h-9 rounded-full border-2 border-white shadow"
        />
      </div>
    </header>
  );
}
