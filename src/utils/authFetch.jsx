export async function authFetch(input, init = {}) {
  let url = typeof input === "string" ? input : input?.url || "";
  const headers = new Headers(init.headers || {});
  const token = localStorage.getItem("token");
  const userRaw = localStorage.getItem("user");
  let user = null;

  try { user = userRaw ? JSON.parse(userRaw) : null; } catch {}

  if (token) headers.set("Authorization", `Bearer ${token}`);

  const base = import.meta.env.VITE_API_URL || "";
  if (url && base && url.startsWith(base)) {
    try {
      const u = new URL(url);
      if (user?.company_id && !u.searchParams.has("company_id")) {
        u.searchParams.set("company_id", user.company_id);
      } else if (user?.companyId && !u.searchParams.has("company_id")) {
        u.searchParams.set("company_id", user.companyId);
      }
      url = u.toString();
    } catch {}
  }

  const res = await fetch(url, { ...init, headers });

  if (res.status === 401) {

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  }

  return res;
}
