import type { FulfilmentType, OrderStatus, PaymentMethod } from "../types";

/** `admin:order_created` payload from `/admin` namespace. */
export interface AdminOrderCreatedEvent {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  fulfilmentType: FulfilmentType;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerPhone: string | null;
  total: number;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  createdAt: string;
}

export const ADMIN_SOCKET_EVENTS = {
  ORDER_CREATED: "admin:order_created",
  ORDER_UPDATED: "admin:order_updated",
} as const;

export type SocketConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";
