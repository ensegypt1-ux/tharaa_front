import type { AdminOrderCreatedEvent } from "./types";
import type { FulfilmentType, Order, OrderStatus } from "../types";
import type { ListOrdersResult } from "../api/orders";

export interface OrdersListFilters {
  q?: string;
  status?: OrderStatus | "";
  fulfilmentType?: FulfilmentType | "";
  sort?: "newest" | "oldest";
  page?: number;
}

export function mapCreatedEventToOrder(event: AdminOrderCreatedEvent): Order {
  return {
    id: event.id,
    orderNumber: event.orderNumber,
    userId: "",
    status: event.status,
    fulfilmentType: event.fulfilmentType,
    paymentMethod: event.paymentMethod,
    subtotal: event.subtotal,
    discountAmount: event.discountAmount,
    deliveryFee: event.deliveryFee,
    total: event.total,
    couponSnapshot: null,
    addressSnapshot: null,
    storeSnapshot: null,
    customerNote: null,
    cancellationReason: null,
    cancelledAt: null,
    confirmedAt: null,
    completedAt: null,
    estimatedReadyAt: null,
    createdAt: event.createdAt,
    updatedAt: event.createdAt,
    items: [],
    user: {
      id: "",
      fullName: event.customerName,
      phone: event.customerPhone,
      email: null,
    },
  };
}

export function orderMatchesFilters(order: Order, filters: OrdersListFilters): boolean {
  if (filters.status && order.status !== filters.status) return false;
  if (filters.fulfilmentType && order.fulfilmentType !== filters.fulfilmentType) return false;
  if (filters.q?.trim()) {
    const q = filters.q.trim().toLowerCase();
    if (!order.orderNumber.toLowerCase().includes(q)) return false;
  }
  return true;
}

export function parseUpdatedAt(value?: string | null): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

/** Returns true if the incoming update should be applied (not stale). */
export function isFreshOrderUpdate(existing: Order | undefined, incoming: Order): boolean {
  if (!existing) return true;
  return parseUpdatedAt(incoming.updatedAt) >= parseUpdatedAt(existing.updatedAt);
}

export function applyOrderCreatedToList(
  current: ListOrdersResult | undefined,
  order: Order,
  filters: OrdersListFilters,
): ListOrdersResult | undefined {
  if (!current) return current;
  if (!orderMatchesFilters(order, filters)) {
    return current;
  }
  if (current.items.some((item) => item.id === order.id)) {
    return current;
  }

  const limit = current.meta.limit || 20;
  const shouldInsertAtTop = (filters.page ?? 1) === 1 && (filters.sort ?? "newest") === "newest";
  const items = shouldInsertAtTop
    ? [order, ...current.items].slice(0, limit)
    : current.items;

  const total = current.meta.total + 1;
  return {
    items,
    meta: {
      ...current.meta,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export function applyOrderUpdatedToList(
  current: ListOrdersResult | undefined,
  order: Order,
  filters: OrdersListFilters,
): ListOrdersResult | undefined {
  if (!current) return current;

  const index = current.items.findIndex((item) => item.id === order.id);
  const matches = orderMatchesFilters(order, filters);

  if (index === -1) {
    if (!matches) return current;
    // Order entered the current filter set — only surface on first newest page.
    return applyOrderCreatedToList(current, order, filters);
  }

  const existing = current.items[index];
  if (!isFreshOrderUpdate(existing, order)) {
    return current;
  }

  if (!matches) {
    const items = current.items.filter((item) => item.id !== order.id);
    const total = Math.max(0, current.meta.total - 1);
    const limit = current.meta.limit || 20;
    return {
      items,
      meta: {
        ...current.meta,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit) || 1),
      },
    };
  }

  const items = [...current.items];
  items[index] = { ...existing, ...order, user: order.user ?? existing.user };
  return { ...current, items };
}

const MAX_SEEN = 200;
const seenEventKeys = new Set<string>();
const seenOrder: string[] = [];

export function claimEventKey(key: string): boolean {
  if (seenEventKeys.has(key)) return false;
  seenEventKeys.add(key);
  seenOrder.push(key);
  while (seenOrder.length > MAX_SEEN) {
    const oldest = seenOrder.shift();
    if (oldest) seenEventKeys.delete(oldest);
  }
  return true;
}
