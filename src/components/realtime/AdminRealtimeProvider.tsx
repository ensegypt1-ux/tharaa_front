"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  connectAdminSocket,
  disconnectAdminSocket,
  onAdminOrderCreated,
  onAdminOrderUpdated,
  onAdminSocketReconnected,
} from "@/lib/realtime/socketManager";
import {
  applyOrderCreatedToList,
  applyOrderUpdatedToList,
  claimEventKey,
  isFreshOrderUpdate,
  mapCreatedEventToOrder,
  type OrdersListFilters,
} from "@/lib/realtime/orderRealtime";
import {
  IMPORTANT_STATUS_SOUNDS,
  playOrderAlertOnce,
  startOrderAlertSession,
  stopOrderAlertSession,
} from "@/lib/realtime/orderAlertSound";
import {
  maybeNotifyNewOrder,
  startBrowserNotifySession,
  stopBrowserNotifySession,
} from "@/lib/realtime/browserOrderNotifications";
import {
  bumpUnreadNewOrder,
  resetUnreadNewOrders,
  startUnreadOrdersTitleTracking,
  stopUnreadOrdersTitleTracking,
} from "@/lib/realtime/unreadOrdersTitle";
import { useToast } from "@/components/ui/Toaster";
import type { AnalyticsOverview, Order, OrderStatus } from "@/lib/types";
import type { ListOrdersResult } from "@/lib/api/orders";

function readOrdersFilters(queryKey: readonly unknown[]): OrdersListFilters | null {
  if (!Array.isArray(queryKey) || queryKey[0] !== "orders") return null;
  return (queryKey[1] ?? {}) as OrdersListFilters;
}

function adjustStatusCounters(
  overview: AnalyticsOverview | undefined,
  fromStatus: Order["status"] | undefined,
  toStatus: Order["status"],
  opts?: { isNewOrder?: boolean },
): AnalyticsOverview | undefined {
  if (!overview?.summary) return overview;
  const summary = { ...overview.summary };

  const dec = (status: Order["status"]) => {
    if (status === "PENDING") summary.pendingOrders = Math.max(0, summary.pendingOrders - 1);
    if (status === "CONFIRMED") summary.confirmedOrders = Math.max(0, summary.confirmedOrders - 1);
    if (status === "PREPARING") summary.preparingOrders = Math.max(0, summary.preparingOrders - 1);
    if (status === "READY") summary.readyOrders = Math.max(0, summary.readyOrders - 1);
    if (status === "OUT_FOR_DELIVERY") {
      summary.outForDeliveryOrders = Math.max(0, summary.outForDeliveryOrders - 1);
    }
    if (status === "COMPLETED") summary.completedOrders = Math.max(0, summary.completedOrders - 1);
    if (status === "CANCELLED") summary.cancelledOrders = Math.max(0, summary.cancelledOrders - 1);
  };

  const inc = (status: Order["status"]) => {
    if (status === "PENDING") summary.pendingOrders += 1;
    if (status === "CONFIRMED") summary.confirmedOrders += 1;
    if (status === "PREPARING") summary.preparingOrders += 1;
    if (status === "READY") summary.readyOrders += 1;
    if (status === "OUT_FOR_DELIVERY") summary.outForDeliveryOrders += 1;
    if (status === "COMPLETED") summary.completedOrders += 1;
    if (status === "CANCELLED") summary.cancelledOrders += 1;
  };

  if (fromStatus && fromStatus !== toStatus) dec(fromStatus);
  if (!fromStatus || fromStatus !== toStatus) inc(toStatus);

  if (opts?.isNewOrder) {
    summary.totalOrders += 1;
    summary.ordersToday += 1;
    summary.ordersInRange += 1;
  }

  return { ...overview, summary };
}

function patchAllOrdersLists(
  queryClient: ReturnType<typeof useQueryClient>,
  patch: (current: ListOrdersResult | undefined, filters: OrdersListFilters) => ListOrdersResult | undefined,
) {
  queryClient
    .getQueryCache()
    .findAll({ queryKey: ["orders"] })
    .forEach((query) => {
      const filters = readOrdersFilters(query.queryKey);
      if (!filters) return;
      const current = query.state.data as ListOrdersResult | undefined;
      queryClient.setQueryData(query.queryKey, patch(current, filters));
    });
}

function isImportantStatus(status: OrderStatus): boolean {
  return IMPORTANT_STATUS_SOUNDS.has(status);
}

export function AdminRealtimeProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      disconnectAdminSocket();
      stopOrderAlertSession();
      stopBrowserNotifySession();
      stopUnreadOrdersTitleTracking();
      return;
    }

    connectAdminSocket();
    startOrderAlertSession();
    startBrowserNotifySession();
    startUnreadOrdersTitleTracking();

    return () => {
      // Keep socket across dashboard routes; logout stops sessions.
    };
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubCreated = onAdminOrderCreated((event) => {
      const eventKey = `created:${event.id}:${event.createdAt}`;
      if (!claimEventKey(eventKey)) return;

      const order = mapCreatedEventToOrder(event);

      patchAllOrdersLists(queryClient, (current, filters) =>
        applyOrderCreatedToList(current, order, filters),
      );

      queryClient.setQueriesData<AnalyticsOverview>({ queryKey: ["analytics-overview"] }, (current) =>
        adjustStatusCounters(current, undefined, order.status, { isNewOrder: true }),
      );

      void queryClient.invalidateQueries({ queryKey: ["analytics-charts"] });
      void queryClient.invalidateQueries({ queryKey: ["analytics-overview"] });

      pushToast(`طلب جديد رقم ${event.orderNumber}`, "amber");
      void playOrderAlertOnce(`sound:new:${event.id}`, "new");
      maybeNotifyNewOrder(event.id, event.orderNumber);
      bumpUnreadNewOrder();

      window.dispatchEvent(
        new CustomEvent("tharaa:order-highlight", { detail: { orderId: event.id } }),
      );
    });

    const unsubUpdated = onAdminOrderUpdated((order) => {
      const eventKey = `updated:${order.id}:${order.updatedAt}`;
      if (!claimEventKey(eventKey)) return;

      const cachedDetail = queryClient.getQueryData<Order>(["order", order.id]);
      if (cachedDetail && !isFreshOrderUpdate(cachedDetail, order)) {
        return;
      }

      let previousStatus: Order["status"] | undefined;
      queryClient.getQueriesData<ListOrdersResult>({ queryKey: ["orders"] }).forEach(([, data]) => {
        const found = data?.items.find((item) => item.id === order.id);
        if (found) previousStatus = found.status;
      });
      if (!previousStatus && cachedDetail) previousStatus = cachedDetail.status;

      patchAllOrdersLists(queryClient, (current, filters) =>
        applyOrderUpdatedToList(current, order, filters),
      );

      if (cachedDetail) {
        queryClient.setQueryData<Order>(["order", order.id], {
          ...cachedDetail,
          ...order,
          user: order.user ?? cachedDetail.user,
          items: order.items?.length ? order.items : cachedDetail.items,
          statusHistory: cachedDetail.statusHistory,
          notifications: cachedDetail.notifications,
          allowedTransitions: cachedDetail.allowedTransitions,
        });
      }

      if (previousStatus !== order.status) {
        queryClient.setQueriesData<AnalyticsOverview>({ queryKey: ["analytics-overview"] }, (current) =>
          adjustStatusCounters(current, previousStatus, order.status),
        );
        void queryClient.invalidateQueries({ queryKey: ["analytics-overview"] });
        void queryClient.invalidateQueries({ queryKey: ["analytics-charts"] });

        if (isImportantStatus(order.status)) {
          void playOrderAlertOnce(
            `sound:status:${order.id}:${order.status}:${order.updatedAt}`,
            "status",
          );
        }
      }
    });

    const unsubReconnect = onAdminSocketReconnected(() => {
      // REST sync only — never replay historical/live sounds for refetch.
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["order"] });
      void queryClient.invalidateQueries({ queryKey: ["analytics-overview"] });
      void queryClient.invalidateQueries({ queryKey: ["analytics-charts"] });
    });

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubReconnect();
    };
  }, [isAuthenticated, queryClient, pushToast]);

  // Reset unread title badge when visiting orders routes.
  useEffect(() => {
    if (!isAuthenticated || typeof window === "undefined") return;

    const maybeReset = () => {
      if (!window.location.pathname.startsWith("/orders")) return;
      // Defer so history/navigation commit + insertion effects finish first.
      queueMicrotask(() => resetUnreadNewOrders());
    };

    queueMicrotask(maybeReset);
    window.addEventListener("popstate", maybeReset);

    const originalPush = window.history.pushState.bind(window.history);
    const originalReplace = window.history.replaceState.bind(window.history);
    window.history.pushState = (...args) => {
      originalPush(...args);
      maybeReset();
    };
    window.history.replaceState = (...args) => {
      originalReplace(...args);
      maybeReset();
    };

    return () => {
      window.removeEventListener("popstate", maybeReset);
      window.history.pushState = originalPush;
      window.history.replaceState = originalReplace;
    };
  }, [isAuthenticated]);

  return <>{children}</>;
}
