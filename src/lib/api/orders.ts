import apiClient, { type ApiEnvelope } from "./client";
import type { Meta, Order, OrderPrintable, OrderStatus, FulfilmentType, PaymentMethod } from "../types";

export interface ListOrdersParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  fulfilmentType?: FulfilmentType;
  paymentMethod?: PaymentMethod;
  userId?: string;
  q?: string;
  from?: string;
  to?: string;
  sort?: "newest" | "oldest";
}

export interface ListOrdersResult {
  items: Order[];
  meta: Meta;
}

export async function listOrders(params: ListOrdersParams): Promise<ListOrdersResult> {
  const res = await apiClient.get<ApiEnvelope<ListOrdersResult>>("/admin/orders", { params });
  return res.data.data;
}

export async function getOrder(id: string): Promise<Order> {
  const res = await apiClient.get<ApiEnvelope<Order>>(`/admin/orders/${id}`);
  return res.data.data;
}

export interface UpdateOrderStatusPayload {
  status: OrderStatus;
  note?: string;
  cancellationReason?: string;
}

export async function updateOrderStatus(id: string, payload: UpdateOrderStatusPayload): Promise<Order> {
  const res = await apiClient.patch<ApiEnvelope<Order>>(`/admin/orders/${id}/status`, payload);
  return res.data.data;
}

export async function getOrderPrint(id: string): Promise<OrderPrintable> {
  const res = await apiClient.get<ApiEnvelope<OrderPrintable>>(`/admin/orders/${id}/print`);
  return res.data.data;
}
