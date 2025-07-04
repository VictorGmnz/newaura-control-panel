import React from "react";
import { Link, useLocation } from "react-router-dom";
import { FaComments, FaChartBar, FaCog, FaChartLine, FaStar } from "react-icons/fa";

const navItems = [
  { label: "Dashboard", icon: <FaChartLine />, to: "/" },
  { label: "Conversas", icon: <FaComments />, to: "/mensagens" },
  { label: "Relatórios", icon: <FaChartBar />, to: "/relatorios" },
  { label: "Feedbacks", icon: <FaStar />, to: "/feedbacks" },
  { label: "Configurações", icon: <FaCog />, to: "/configuracoes" },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="bg-white shadow w-20 md:w-56 flex flex-col fixed left-0 h-[calc(100vh-56px)]">
      <nav className="flex-1 flex flex-col gap-2 mt-4">
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className={`flex items-center px-4 py-2 rounded-lg mx-2 gap-4 transition ${
              location.pathname === item.to
                ? "bg-primary text-white shadow"
                : "text-gray-600 hover:bg-gray-100"
            }`}
            style={{ textDecoration: "none" }}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="hidden md:inline text-base">{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
