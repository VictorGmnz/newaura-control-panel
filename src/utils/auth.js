import { jwtDecode } from "jwt-decode";

const TOKEN_KEY = "na_token";

export function saveToken(t) {
  localStorage.setItem(TOKEN_KEY, t);
}
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getSession() {
  const tok = getToken();
  if (!tok) return null;
  try {
    const payload = jwtDecode(tok);
    if (!payload?.exp || Date.now() / 1000 > payload.exp) {
      clearToken();
      return null;
    }
    return {
      token: tok,
      employeeId: payload.sub,
      companyId: payload.company_id,
      exp: payload.exp,
    };
  } catch {
    clearToken();
    return null;
  }
}
