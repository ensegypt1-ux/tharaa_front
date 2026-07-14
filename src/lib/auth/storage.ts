import Cookies from "js-cookie";
import type { AuthUser } from "./types";

export const ACCESS_TOKEN_COOKIE = "tharaa_access";
export const REFRESH_TOKEN_COOKIE = "tharaa_refresh";
const USER_STORAGE_KEY = "tharaa_user";

const cookieOptions: Cookies.CookieAttributes = {
  path: "/",
  sameSite: "lax",
  expires: 30,
};

export function getAccessToken(): string | undefined {
  return Cookies.get(ACCESS_TOKEN_COOKIE);
}

export function getRefreshToken(): string | undefined {
  return Cookies.get(REFRESH_TOKEN_COOKIE);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  Cookies.set(ACCESS_TOKEN_COOKIE, accessToken, cookieOptions);
  Cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions);
}

export function clearTokens(): void {
  Cookies.remove(ACCESS_TOKEN_COOKIE, { path: "/" });
  Cookies.remove(REFRESH_TOKEN_COOKIE, { path: "/" });
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser | null): void {
  if (typeof window === "undefined") return;
  if (!user) {
    window.localStorage.removeItem(USER_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  clearTokens();
  setStoredUser(null);
}
