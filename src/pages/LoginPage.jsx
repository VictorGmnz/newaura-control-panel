import React, { useState } from "react";
import { authFetch } from "../utils/authFetch";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    authFetch("http://localhost:8000/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    })
      .then(async res => {
        if (!res.ok) {
          let backendMsg = "";
          try {
            const data = await res.json();
            backendMsg = data?.detail;
          } catch (err) {
            backendMsg = "";
          }
          if (res.status === 401)
            throw new Error(backendMsg || "Usuário ou senha inválidos.");
          if (res.status === 403)
            throw new Error(backendMsg || "Usuário inativo. Peça para o administrador liberar seu acesso.");
          throw new Error(backendMsg || "Erro inesperado. Tente novamente.");
        }
        return res.json();
      })
      .then(data => {
        localStorage.setItem("token", data.token);
        onLogin();
      })
      .catch(err => {
        setError("Ocorreu um problema de conexão.\nPor favor, tente novamente mais tarde.");
      })
      .finally(() => setLoading(false));
  }

  return (
    <div
      className="flex items-center justify-center min-h-screen"
      style={{ background: "#586C83" }}
    >
      <div className="relative bg-white shadow-2xl rounded-3xl p-8 w-full max-w-sm flex flex-col items-center"
        style={{ boxShadow: "0 8px 32px 0 rgba(90,46,187,0.18)" }}
      >
        {/* Logo flutuando acima do card */}
        <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-10">
          <img
            src="/logo.jpg"
            alt="Logo New Aura"
            className="w-36 h-32 rounded-xl object-cover shadow-lg border-4 border-white"
            style={{
              background: "rgba(255,255,255,0.8)",
            }}
          />
        </div>
        <form
          onSubmit={handleSubmit}
          className="w-full flex flex-col items-center mt-4"
        >
          <h2 className="text-2xl font-bold mb-6 text-center text-primary mt-8">
            Login
          </h2>
          {error &&
            error.split("\n").map((line, idx) => (
              <div key={idx} className="text-red-500 text-center">
                {line}
              </div>
            ))}
          <input
            type="text"
            placeholder="Usuário"
            id="user-value"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full px-3 py-2 mb-4 border rounded"
            disabled={loading}
            required
          />
          <input
            type="password"
            placeholder="Senha"
            id="pw-value"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2 mb-6 border rounded"
            disabled={loading}
            required
          />
          <button
            type="submit"
            className="w-full bg-primary text-white py-2 rounded-xl font-bold hover:bg-purple-700 shadow"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
