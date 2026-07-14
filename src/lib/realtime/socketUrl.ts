import { API_BASE_URL } from "../api/client";

/** Socket.IO namespace is on the API host, not under `/api/v1`. */
export function getAdminSocketUrl(): string {
  const base = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
  return `${base}/admin`;
}
