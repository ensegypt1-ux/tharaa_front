"use client";

import { useSyncExternalStore } from "react";
import { Wifi, WifiOff, LoaderCircle } from "lucide-react";
import {
  getAdminSocketStateSnapshot,
  getAdminSocketStateServerSnapshot,
  subscribeAdminSocketState,
} from "@/lib/realtime/socketManager";
import type { SocketConnectionState } from "@/lib/realtime/types";
import { cn } from "@/lib/utils/cn";

const LABEL: Record<SocketConnectionState, string> = {
  idle: "غير متصل",
  connecting: "جارٍ إعادة الاتصال",
  connected: "متصل",
  disconnected: "غير متصل",
  error: "غير متصل",
};

export function SocketStatusBadge({ compact = false }: { compact?: boolean }) {
  const state = useSyncExternalStore(
    subscribeAdminSocketState,
    getAdminSocketStateSnapshot,
    getAdminSocketStateServerSnapshot,
  );

  const online = state === "connected";
  const reconnecting = state === "connecting";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        online && "bg-[var(--success-soft)] text-success",
        reconnecting && "bg-[var(--warning-soft)] text-warning",
        !online && !reconnecting && "bg-cream text-charcoal-soft",
      )}
      title={LABEL[state]}
    >
      {online ? (
        <Wifi className="size-3.5" aria-hidden />
      ) : reconnecting ? (
        <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
      ) : (
        <WifiOff className="size-3.5" aria-hidden />
      )}
      {!compact && LABEL[state]}
      {compact && <span className="sr-only">{LABEL[state]}</span>}
    </span>
  );
}
