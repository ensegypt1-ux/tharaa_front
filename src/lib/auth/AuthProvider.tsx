"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import apiClient, { type ApiEnvelope } from "../api/client";
import { parseApiError } from "../api/errors";
import { getMe } from "../api/users";
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  setStoredUser,
  setTokens,
} from "./storage";
import { isStaffRole } from "./roles";
import type { AuthUser, LoginResponse } from "./types";
import { COMMON_AR } from "../ar/labels";
import { disconnectAdminSocket } from "../realtime/socketManager";
import {
  activateOrderSounds,
  startOrderAlertSession,
  stopOrderAlertSession,
} from "../realtime/orderAlertSound";
import {
  startBrowserNotifySession,
  stopBrowserNotifySession,
} from "../realtime/browserOrderNotifications";
import { stopUnreadOrdersTitleTracking } from "../realtime/unreadOrdersTitle";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const token = getAccessToken();
      if (!token) {
        clearSession();
        if (!cancelled) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const me = await getMe();
        if (!isStaffRole(me.role)) {
          clearSession();
          if (!cancelled) setUser(null);
          return;
        }
        setStoredUser(me);
        if (!cancelled) setUser(me);
      } catch {
        clearSession();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    try {
      const response = await apiClient.post<ApiEnvelope<LoginResponse>>(
        "/auth/login",
        { identifier, password },
      );
      const { accessToken, refreshToken, user: loggedInUser } =
        response.data.data;

      if (!isStaffRole(loggedInUser.role)) {
        throw Object.assign(new Error(COMMON_AR.notStaff), { code: "NOT_STAFF" });
      }

      setTokens(accessToken, refreshToken);
      setStoredUser(loggedInUser);
      setUser(loggedInUser);
      // Login click is a user gesture — unlock audio in the same turn when possible.
      startOrderAlertSession();
      startBrowserNotifySession();
      void activateOrderSounds();
      return loggedInUser;
    } catch (error) {
      if (error instanceof Error && (error as { code?: string }).code === "NOT_STAFF") {
        throw error;
      }
      throw parseApiError(error);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const storedRefresh = getRefreshToken();
      if (storedRefresh) {
        await apiClient.post("/auth/logout", { refreshToken: storedRefresh });
      }
    } catch {
      // ignore logout errors, always clear locally
    } finally {
      disconnectAdminSocket();
      stopOrderAlertSession();
      stopBrowserNotifySession();
      stopUnreadOrdersTitleTracking();
      clearSession();
      setUser(null);
      router.replace("/login");
    }
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      logout,
    }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
