import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "../auth/storage";
import { parseApiError } from "./errors";
import { disconnectAdminSocket, reconnectAdminSocketWithToken } from "../realtime/socketManager";

export interface ApiEnvelope<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1";

export const STATIC_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

/** Resolves a backend-relative static path (e.g. "/products/x.jpg") to a full URL. */
export function resolveStaticUrl(pathOrUrl?: string | null): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const normalized = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${STATIC_BASE_URL}${normalized}`;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await axios.post<{
      success: true;
      data: { accessToken: string; refreshToken: string };
    }>(`${API_BASE_URL}/auth/refresh`, { refreshToken });
    const { accessToken, refreshToken: nextRefreshToken } = response.data.data;
    setTokens(accessToken, nextRefreshToken);
    reconnectAdminSocketWithToken(accessToken);
    return accessToken;
  } catch {
    return null;
  }
}

function redirectToLogin(): void {
  disconnectAdminSocket();
  clearSession();
  if (typeof window !== "undefined") {
    const next = window.location.pathname + window.location.search;
    window.location.href = `/login?sessionExpired=1&next=${encodeURIComponent(next)}`;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (AxiosRequestConfig & { _retry?: boolean })
      | undefined;

    const status = error.response?.status;
    const isAuthEndpoint = originalRequest?.url?.includes("/auth/");

    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;

      if (newToken) {
        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${newToken}`,
        };
        return apiClient.request(originalRequest);
      }

      redirectToLogin();
      return Promise.reject(parseApiError(error));
    }

    return Promise.reject(parseApiError(error));
  },
);

export default apiClient;
