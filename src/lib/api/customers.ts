import apiClient, { type ApiEnvelope } from "./client";
import type {
  AccountStatus,
  CustomerAddress,
  CustomerAnalytics,
  CustomerDetail,
  CustomerListItem,
  CustomerOrderRow,
  CustomerSummary,
  FulfilmentType,
  Meta,
  OrderStatus,
} from "../types";

export interface ListCustomersParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: AccountStatus;
}

export async function listCustomers(
  params: ListCustomersParams,
): Promise<{ data: CustomerListItem[]; meta: Meta }> {
  const res = await apiClient.get<ApiEnvelope<CustomerListItem[]>>("/admin/customers", { params });
  return { data: res.data.data, meta: res.data.meta as unknown as Meta };
}

export async function getCustomer(id: string): Promise<CustomerDetail> {
  const res = await apiClient.get<ApiEnvelope<CustomerDetail>>(`/admin/customers/${id}`);
  return res.data.data;
}

export async function getCustomerSummary(id: string): Promise<CustomerSummary> {
  const res = await apiClient.get<ApiEnvelope<CustomerSummary>>(`/admin/customers/${id}/summary`);
  return res.data.data;
}

export async function getCustomerAnalytics(id: string): Promise<CustomerAnalytics> {
  const res = await apiClient.get<ApiEnvelope<CustomerAnalytics>>(`/admin/customers/${id}/analytics`);
  return res.data.data;
}

export async function listCustomerOrders(
  id: string,
  params: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    fulfilmentType?: FulfilmentType;
    from?: string;
    to?: string;
    sort?: "newest" | "oldest";
  },
): Promise<{ items: CustomerOrderRow[]; meta: Meta }> {
  const res = await apiClient.get<ApiEnvelope<{ items: CustomerOrderRow[]; meta: Meta }>>(
    `/admin/customers/${id}/orders`,
    { params },
  );
  return res.data.data;
}

export async function listCustomerAddresses(id: string): Promise<CustomerAddress[]> {
  const res = await apiClient.get<ApiEnvelope<CustomerAddress[]>>(`/admin/customers/${id}/addresses`);
  return res.data.data;
}

export async function listCustomerReviews(
  id: string,
  params?: { page?: number; limit?: number },
): Promise<{ data: CustomerDetail["reviews"]; meta: Meta }> {
  const res = await apiClient.get<ApiEnvelope<CustomerDetail["reviews"]>>(
    `/admin/customers/${id}/reviews`,
    { params },
  );
  return { data: res.data.data, meta: res.data.meta as unknown as Meta };
}

export async function listCustomerNotifications(
  id: string,
  params?: { page?: number; limit?: number },
): Promise<{ data: CustomerDetail["notifications"]; meta: Meta }> {
  const res = await apiClient.get<ApiEnvelope<CustomerDetail["notifications"]>>(
    `/admin/customers/${id}/notifications`,
    { params },
  );
  return { data: res.data.data, meta: res.data.meta as unknown as Meta };
}

export async function updateCustomerStatus(
  id: string,
  status: "ACTIVE" | "SUSPENDED",
): Promise<CustomerListItem> {
  const res = await apiClient.patch<ApiEnvelope<CustomerListItem>>(`/admin/customers/${id}/status`, {
    status,
  });
  return res.data.data;
}
