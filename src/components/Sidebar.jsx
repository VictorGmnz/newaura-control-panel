import React from "react";

import { FaComments, FaChartBar, FaCog, FaChartLine, FaStar } from "react-icons/fa";

const navItems = [
  { label: "Dashboard", icon: <FaChartLine />, active: true },
  { label: "Conversas", icon: <FaComments /> },
  { label: "Relatórios", icon: <FaChartBar /> },
  { label: "Feedbacks", icon: <FaStar /> },
  { label: "Configurações", icon: <FaCog /> },
];

export default function Sidebar() {
  return (
    <aside className="bg-white shadow h-screen w-20 md:w-56 flex flex-col fixed left-0 top-0 z-10">
      <div className="flex items-center justify-center md:justify-start py-6 px-3">
        <img src="/logo.jpg" alt="Logo" className="h-10 mr-0 md:mr-2" />
        <span className="hidden md:inline text-xl font-semibold text-primary">New Aura</span>
      </div>
      <nav className="flex-1 flex flex-col gap-2 mt-4">
        {navItems.map((item, idx) => (
          <div
            key={item.label}
            className={`flex items-center px-4 py-2 cursor-pointer rounded-lg mx-2 gap-4 ${
              item.active
                ? "bg-primary text-white shadow"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="hidden md:inline text-base">{item.label}</span>
          </div>
        ))}
      </nav>
    </aside>
  );
}
