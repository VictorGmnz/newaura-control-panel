import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import MessagesPage from "./pages/MessagesPage";
import FeedbacksPage from "./pages/FeedbacksPage";
import ReportsPage from "./pages/ReportsPage";

export default function App() {
  const [filters, setFilters] = useState({ start: "2025-06-01", end: "2025-06-30"});

  return (
    <Router>
      <Sidebar />
      <div className="md:ml-56 ml-20 pt-20 px-4 md:px-8 pb-8 bg-gray-100 min-h-screen">
        <Header />
        <Routes>
          <Route path="/" element={<Dashboard filters={filters} />} />
          <Route path="/mensagens" element={<MessagesPage filters={filters} />} />
          <Route path="/feedbacks" element={<FeedbacksPage filters={filters} />} />
          <Route path="/relatorios" element={<ReportsPage filters={filters} />} />
        </Routes>
      </div>
    </Router>
  );
}
