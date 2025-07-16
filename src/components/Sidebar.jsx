import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaComments, FaChartBar, FaCog, FaChartLine, FaStar, FaFile , FaBuilding, FaUsers, FaBolt } from "react-icons/fa";
import { useAuth } from "../utils/authData";

  const navItems = [
    { label: "Dashboard", icon: <FaChartLine />, to: "/", roles: ["Administrador", "Supervisor", "Colaborador"] },
    { label: "Conversas", icon: <FaComments />, to: "/mensagens", roles: ["Administrador", "Supervisor", "Colaborador"] },
    { label: "Conversas Ativas", icon: <FaBolt />, to: "/conversas-ativas", roles: ["Administrador", "Supervisor", "Colaborador"] },
    { label: "Feedbacks", icon: <FaStar />, to: "/feedbacks", roles: ["Administrador", "Supervisor", "Colaborador"] },
    { label: "Relatórios", icon: <FaChartBar />, to: "/relatorios", roles: ["Administrador", "Supervisor"]},
  ];

const configSubMenus = [
  { label: "Empresa", to: "/configuracoes/empresa", icon: <FaBuilding /> },
  { label: "Documentos", to: "/configuracoes/documentos", icon: <FaFile /> },
  { label: "Colaboradores", to: "/configuracoes/colaboradores", icon: <FaUsers /> },
];

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const [showConfig, setShowConfig] = useState(false);

  if (!user) return null;

  return (
    <aside className="bg-white shadow w-20 md:w-56 flex flex-col fixed left-0 top-20 h-[calc(100vh-56px)] z-50">
      <nav className="flex-1 flex flex-col gap-2 mt-4">
        {navItems
          .filter(item => item.roles.includes(user.role))
          .map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={`flex items-center px-4 py-2 rounded-lg mx-2 gap-4 transition ${
                location.pathname === item.to
                  ? "bg-primary text-white shadow"
                  : "text-gray-600 hover:bg-gray-200"
              }`}
              style={{ textDecoration: "none" }}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="hidden md:inline text-base">{item.label}</span>
            </Link>
          ))}

        {/* Configurações com sub-menu */}
        {user.role === "Administrador" && (
          <div
            className={`relative group`}
            onMouseEnter={() => setShowConfig(true)}
            onMouseLeave={() => setShowConfig(false)}
          >
            <div
              className={`flex items-center px-4 py-2 rounded-lg mx-2 gap-4 cursor-pointer transition ${
                location.pathname.startsWith("/configuracoes")
                  ? "bg-primary text-white shadow"
                  : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              <span className="text-lg"><FaCog /></span>
              <span className="hidden md:inline text-base">Configurações</span>
            </div>
            {/* Sub-menu dropdown */}
            {showConfig && (
              <div className="absolute left-full top-0 bg-white border rounded-lg shadow-xl min-w-[180px] z-50 py-2 flex flex-col animate-fade-in-up">
                {configSubMenus.map((sub) => (
                  <Link
                    key={sub.label}
                    to={sub.to}
                    className={`flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-[#5A2EBB] hover:text-white`}
                    style={{ textDecoration: "none" }}
                  >
                    <span className="text-base">{sub.icon}</span>
                    <span >{sub.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>
    </aside>
  );
}
