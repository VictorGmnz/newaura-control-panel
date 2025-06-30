// authFetch.js
export function authFetch(url, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  return fetch(url, { ...options, headers })
    .then(async res => {
      if (res.status === 401) {
        if (!window.location.pathname.includes("/login")) {
          localStorage.removeItem("token");
          alert("Ocorreu um problema. Por favor, faça login novamente.");
          window.location.href = "/login";
        }
      }
      return res;
    });
}
