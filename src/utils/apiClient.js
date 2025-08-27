// /utils/apiClient.js
import axios from "axios";
import { getSession, clearToken } from "./auth";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const s = getSession();
  if (s?.token) {
    config.headers = { ...(config.headers || {}), Authorization: `Bearer ${s.token}` };
  }
  if (s?.companyId) {
    config.params = { ...(config.params || {}), company_id: s.companyId };
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      clearToken();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
