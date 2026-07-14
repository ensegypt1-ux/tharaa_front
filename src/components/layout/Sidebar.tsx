"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, ShoppingBasket } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { accessibleNavKeys, type NavKey } from "@/lib/auth/roles";
import { useAuth } from "@/lib/auth/AuthProvider";
import { COMMON_AR } from "@/lib/ar/labels";
import { NAV_ITEMS } from "./navConfig";
import { useOpsCounters } from "@/lib/ops/useOpsCounters";
import { useSyncExternalStore } from "react";
import {
  getUnreadNewOrders,
  getUnreadNewOrdersServerSnapshot,
  subscribeUnreadNewOrders,
} from "@/lib/realtime/unreadOrdersTitle";

const NAV_GROUPS: { title: string; keys: NavKey[] }[] = [
  { title: "التشغيل", keys: ["overview", "orders"] },
  { title: "الكتالوج", keys: ["categories", "products", "inventory", "missingImages"] },
  { title: "التسويق", keys: ["offers", "coupons"] },
  { title: "العملاء", keys: ["customers", "reviews", "notifications"] },
  { title: "الإعدادات", keys: ["delivery", "settings", "activity"] },
];

function NavBadge({ value }: { value: number }) {
  if (!value || value <= 0) return null;
  return (
    <span className="ms-auto inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-charcoal">
      {value > 99 ? "99+" : value}
    </span>
  );
}

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const allowedKeys = new Set(accessibleNavKeys(user?.role));
  const counters = useOpsCounters();
  const unreadOrders = useSyncExternalStore(
    subscribeUnreadNewOrders,
    getUnreadNewOrders,
    getUnreadNewOrdersServerSnapshot,
  );

  const badgeFor = (key: NavKey): number => {
    if (key === "orders") return Math.max(counters.pendingOrders, unreadOrders);
    if (key === "missingImages") return counters.missingImages;
    if (key === "reviews") return counters.pendingReviews;
    return 0;
  };

  return (
    <aside
      className={cn(
        "sticky top-0 z-40 flex h-screen shrink-0 flex-col border-s border-border-soft bg-surface shadow-[var(--shadow-xs)] transition-[width] duration-[var(--duration-base)]",
        collapsed ? "w-[var(--sidebar-w-collapsed)]" : "w-[var(--sidebar-w)]",
      )}
    >
      <div className="flex h-[var(--header-h)] items-center gap-2.5 border-b border-border-soft px-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-amber-500 text-charcoal shadow-[var(--shadow-xs)]">
          <ShoppingBasket className="size-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight text-charcoal">{COMMON_AR.brandName}</p>
            <p className="truncate text-xs text-charcoal-soft">{COMMON_AR.adminDashboard}</p>
          </div>
        )}
      </div>

      <nav className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-2.5 py-4">
        {NAV_GROUPS.map((group) => {
          const items = NAV_ITEMS.filter((item) => group.keys.includes(item.key) && allowedKeys.has(item.key));
          if (items.length === 0) return null;
          return (
            <div key={group.title}>
              {!collapsed && (
                <p className="mb-1.5 px-2 text-[11px] font-semibold tracking-wide text-charcoal-muted uppercase">
                  {group.title}
                </p>
              )}
              <div className="space-y-1">
                {items.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  const badge = badgeFor(item.key);
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      title={collapsed ? `${item.label}${badge ? ` (${badge})` : ""}` : undefined}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-sm font-medium transition duration-[var(--duration-fast)]",
                        isActive
                          ? "bg-amber-100 text-amber-900 shadow-[inset_0_0_0_1px_rgb(245_166_35_/_0.25)]"
                          : "text-charcoal-soft hover:bg-cream hover:text-charcoal",
                        collapsed && "justify-center px-0",
                      )}
                    >
                      <span className="relative">
                        <Icon className={cn("size-[18px] shrink-0", isActive && "text-amber-700")} />
                        {collapsed && badge > 0 && (
                          <span className="absolute -start-1 -top-1 size-2 rounded-full bg-amber-500" />
                        )}
                      </span>
                      {!collapsed && (
                        <>
                          <span className="truncate">{item.label}</span>
                          <NavBadge value={badge} />
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <button
        onClick={onToggle}
        className="flex h-12 items-center justify-center gap-2 border-t border-border-soft text-charcoal-soft transition hover:bg-cream hover:text-charcoal"
        type="button"
      >
        {collapsed ? (
          <>
            <ChevronsLeft className="size-4" />
            <span className="sr-only">{COMMON_AR.expand}</span>
          </>
        ) : (
          <>
            <ChevronsRight className="size-4" />
            <span className="text-xs font-medium">{COMMON_AR.collapse}</span>
          </>
        )}
      </button>
    </aside>
  );
}
