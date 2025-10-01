import React, { useMemo, useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaComments,
  FaChartBar,
  FaCog,
  FaChartLine,
  FaStar,
  FaCrosshairs,
  FaBuilding,
  FaUsers,
  FaRobot,
  FaSignOutAlt,
  FaHandshake,
} from "react-icons/fa";
import { useAuth } from "../utils/authData";

const NAV_ITEMS = [
  { label: "Dashboard", icon: <FaChartLine />, to: "/", perm: "dashboard" },
  { label: "Conversas", icon: <FaComments />, to: "/conversas", perm: "messages" },
  { label: "Feedbacks", icon: <FaStar />, to: "/feedbacks", perm: "feedback" },
  { label: "Relatórios", icon: <FaChartBar />, to: "/relatorios", perm: "reports" },
];

const CONFIG_SUBMENUS = [
  { label: "Empresa", to: "/configuracoes/empresa", icon: <FaBuilding />, perm: "config_company" },
  { label: "Clientes", to: "/configuracoes/clientes", icon: <FaHandshake />, perm: "config_documents" },
  { label: "Leads", to: "/configuracoes/leads", icon: <FaCrosshairs />, perm: "config_documents" },
  { label: "Colaboradores", to: "/configuracoes/colaboradores", icon: <FaUsers />, perm: "config_documents" },
  { label: "Chatbot", to: "/configuracoes/chatbot", icon: <FaRobot />, perm: "config_chatbot" },
];

function normalizeAllowedPages(user) {
  const ap = Array.isArray(user?.allowed_pages) ? user.allowed_pages : [];
  return ap.map(String).map((s) => s.trim()).filter(Boolean);
}

export default function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showConfig, setShowConfig] = useState(false);
  const configRef = useRef(null);

  if (!user) return null;

  const allowed = useMemo(() => normalizeAllowedPages(user), [user]);
  const allowedSet = useMemo(() => new Set(allowed), [allowed]);
  const allPages = allowedSet.has("all_pages");

  const hasPerm = (key) => {
    if (!key) return false;
    if (allPages) return true;
    if (key.startsWith("config_") && allowedSet.has("config_root")) return true;
    return allowedSet.has(key);
  };

  const showConfigRoot =
    allPages ||
    allowedSet.has("config_root") ||
    CONFIG_SUBMENUS.some((s) => hasPerm(s.perm));

  const navToRender = allPages ? NAV_ITEMS : NAV_ITEMS.filter((item) => hasPerm(item.perm));
  const configToRender = allPages ? CONFIG_SUBMENUS : CONFIG_SUBMENUS.filter((s) => hasPerm(s.perm));

  useEffect(() => {
    setShowConfig(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (!showConfig) return;
      if (configRef.current && !configRef.current.contains(e.target)) {
        setShowConfig(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showConfig]);

  function handleLogout() {
    logout();
    window.location.href = "/login";
  }

  return (
    <aside className="bg-white shadow w-20 md:w-56 flex flex-col fixed left-0 top-24 h-[calc(100vh-56px)] z-50">
      <nav className="flex-1 flex flex-col gap-2 mt-4">
        {navToRender.map((item) => (
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

        {showConfigRoot && (
          <div ref={configRef} className="relative" onMouseEnter={() => setShowConfig(true)}>
            <div
              className={`flex items-center px-4 py-2 rounded-lg mx-2 gap-4 cursor-pointer transition ${
                location.pathname.startsWith("/configuracoes")
                  ? "bg-primary text-white shadow"
                  : "text-gray-600 hover:bg-gray-200"
              }`}
              title="Configurações"
            >
              <span className="text-lg"><FaCog /></span>
              <span className="hidden md:inline text-base">Configurações</span>
            </div>

            {showConfig && (
              <div className="absolute left-full top-0 bg-white border rounded-lg shadow-xl min-w-[280px] z-50 py-2 flex flex-col animate-fade-in-up">
                {configToRender.map((sub) => (
                  <Link
                    key={sub.label}
                    to={sub.to}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-[#5A2EBB] hover:text-white"
                    style={{ textDecoration: "none" }}
                  >
                    <span className="text-base">{sub.icon}</span>
                    <span>{sub.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="absolute bottom-12 left-0 right-0 px-2">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-2 rounded-lg gap-4 text-white bg-gray-600 hover:bg-gray-500 transition"
            title="Sair"
          >
            <span className="text-lg"><FaSignOutAlt /></span>
            <span className="hidden md:inline text-base">Sair</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
