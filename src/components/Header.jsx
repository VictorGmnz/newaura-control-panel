import React from "react";
import { FaBell } from "react-icons/fa";

export default function Header() {
  return (
    <header className="flex items-center justify-between px-4 md:px-8 py-3 bg-white shadow-sm w-full fixed left-0 top-0 z-20 ml-20 md:ml-56">
      <div className="flex flex-col">
        <span className="font-bold text-lg text-primary">Painel New Aura</span>
        <span className="text-xs text-gray-500">Soluções digitais com IA e WhatsApp</span>
      </div>
      <div className="flex items-center gap-5">
        <button className="relative p-2 rounded-full hover:bg-gray-100 transition">
          <FaBell className="text-primary text-lg" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full border border-white"></span>
        </button>
        <img
          src="https://ui-avatars.com/api/?name=Cliente&background=5A2EBB&color=fff"
          alt="Avatar"
          className="w-9 h-9 rounded-full border-2 border-primary"
        />
      </div>
    </header>
  );
}
