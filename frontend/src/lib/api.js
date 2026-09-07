import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Fallback bearer from localStorage (mobile Safari sometimes drops SameSite=none cookies)
api.interceptors.request.use((config) => {
  const tok = localStorage.getItem("volt_token");
  if (tok && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${tok}`;
  }
  return config;
});

export function formatApiError(detail) {
  if (detail == null) return "Algo deu errado, tente novamente.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}
