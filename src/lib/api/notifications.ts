import apiClient, { type ApiEnvelope } from "./client";
import type { Meta, NotificationItem } from "../types";

export async function listAdminNotifications(params: {
  page?: number;
  limit?: number;
  userId?: string;
}): Promise<{ data: NotificationItem[]; meta: Meta }> {
  const res = await apiClient.get<ApiEnvelope<NotificationItem[]>>("/admin/notifications", { params });
  return { data: res.data.data, meta: res.data.meta as unknown as Meta };
}

export interface BroadcastPayload {
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  userIds?: string[];
  orderId?: string;
  productId?: string;
  type?: "ADMIN" | "OFFER" | "SYSTEM" | "ORDER_STATUS";
}

export interface BroadcastResult {
  sent: number;
  notificationIds: string[];
}

export async function broadcastNotification(payload: BroadcastPayload): Promise<BroadcastResult> {
  const res = await apiClient.post<ApiEnvelope<BroadcastResult>>("/admin/notifications/broadcast", payload);
  return res.data.data;
}
