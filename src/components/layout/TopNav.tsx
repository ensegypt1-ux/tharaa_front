"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, ClipboardList, LogOut, Search, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { RoleBadge } from "@/components/ui/StatusBadge";
import { initials } from "@/lib/utils/format";
import { COMMON_AR, ROLE_AR, labelOf } from "@/lib/ar/labels";
import { cn } from "@/lib/utils/cn";
import { OrderSoundControl } from "@/components/layout/OrderSoundControl";
import { SocketStatusBadge } from "@/components/realtime/SocketStatusBadge";
import { useOpsCounters } from "@/lib/ops/useOpsCounters";
import {
  getUnreadNewOrders,
  getUnreadNewOrdersServerSnapshot,
  subscribeUnreadNewOrders,
} from "@/lib/realtime/unreadOrdersTitle";

export function TopNav() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const counters = useOpsCounters();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const unread = useSyncExternalStore(
    subscribeUnreadNewOrders,
    getUnreadNewOrders,
    getUnreadNewOrdersServerSnapshot,
  );

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/orders?q=${encodeURIComponent(search.trim())}`);
    }
  };

  const pendingBadge = Math.max(counters.pendingOrders, unread);

  return (
    <header className="sticky top-0 z-30 flex h-[var(--header-h)] items-center gap-3 border-b border-border-soft bg-surface/95 px-4 backdrop-blur md:px-6">
      <form onSubmit={onSearchSubmit} className="hidden min-w-0 max-w-md flex-1 md:block">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-charcoal-soft" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={COMMON_AR.searchOrderPlaceholder}
            className="h-10 w-full rounded-[var(--radius-md)] border border-border-soft bg-cream/60 pe-3 ps-9 text-sm outline-none transition focus:border-amber-400 focus:bg-surface focus:ring-2 focus:ring-amber-100"
          />
        </div>
      </form>

      <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
        <SocketStatusBadge />

        <button
          type="button"
          onClick={() => router.push("/orders?status=PENDING")}
          className="relative hidden items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 py-2 text-xs font-medium text-charcoal-soft transition hover:bg-cream hover:text-charcoal sm:inline-flex"
          title="الطلبات المعلقة"
        >
          <ClipboardList className="size-4" />
          الطلبات المعلقة
          {pendingBadge > 0 && (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-charcoal">
              {pendingBadge > 99 ? "99+" : pendingBadge}
            </span>
          )}
        </button>

        <OrderSoundControl />

        <button
          type="button"
          className="relative flex size-9 items-center justify-center rounded-[var(--radius-md)] text-charcoal-soft transition hover:bg-cream hover:text-charcoal"
          title={COMMON_AR.notifications}
          aria-label={COMMON_AR.notifications}
          onClick={() => router.push("/notifications")}
        >
          <Bell className="size-5" />
          {counters.pendingReviews > 0 && (
            <span className="absolute end-1.5 top-1.5 size-2 rounded-full bg-danger" />
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full py-1 pe-2 ps-1 transition hover:bg-cream"
            type="button"
          >
            <div className="flex size-8 items-center justify-center rounded-full bg-amber-500 text-sm font-semibold text-charcoal">
              {initials(user?.fullName)}
            </div>
            <div className="hidden text-start sm:block">
              <p className="max-w-32 truncate text-sm font-medium text-charcoal">{user?.fullName}</p>
              {user && <RoleBadge role={user.role} />}
            </div>
            <ChevronDown className="size-4 text-charcoal-soft" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute end-0 z-40 mt-2 w-56 animate-in overflow-hidden rounded-[var(--radius-lg)] border border-border-soft bg-surface shadow-[var(--shadow-md)]">
                <div className="border-b border-border-soft px-4 py-3">
                  <p className="truncate text-sm font-medium text-charcoal">{user?.fullName}</p>
                  <p className="truncate text-xs text-charcoal-soft ltr-field">{user?.email ?? user?.phone}</p>
                </div>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 px-4 py-2.5 text-start text-sm text-charcoal-soft transition hover:bg-cream hover:text-charcoal",
                  )}
                  onClick={() => setMenuOpen(false)}
                >
                  <UserIcon className="size-4" />
                  {COMMON_AR.signedInAs} {labelOf(ROLE_AR, user?.role)}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    void logout();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-start text-sm text-danger transition hover:bg-red-50"
                >
                  <LogOut className="size-4" />
                  {COMMON_AR.logout}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
