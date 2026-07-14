import apiClient, { type ApiEnvelope } from "./client";
import type { InventoryMovement, InventoryRow, Meta } from "../types";

export interface ListInventoryParams {
  page?: number;
  limit?: number;
  q?: string;
  categoryId?: string;
  stockStatus?: "all" | "low" | "out";
}

export async function listInventory(params: ListInventoryParams): Promise<{ data: InventoryRow[]; meta: Meta }> {
  const res = await apiClient.get<ApiEnvelope<InventoryRow[]>>("/admin/inventory", { params });
  return { data: res.data.data, meta: res.data.meta as unknown as Meta };
}

export interface ListMovementsParams {
  page?: number;
  limit?: number;
  productId?: string;
  variantId?: string;
  inventoryId?: string;
}

export async function listInventoryMovements(
  params: ListMovementsParams,
): Promise<{ data: InventoryMovement[]; meta: Meta }> {
  const res = await apiClient.get<ApiEnvelope<InventoryMovement[]>>("/admin/inventory/movements", { params });
  return { data: res.data.data, meta: res.data.meta as unknown as Meta };
}

export interface AdjustInventoryPayload {
  productId?: string;
  variantId?: string;
  delta: number;
  note?: string;
}

export interface InventoryMutationResult {
  inventory: {
    id: string;
    productId: string | null;
    variantId: string | null;
    quantity: number;
    reservedQuantity: number;
    available: number;
    updatedAt: string;
  };
  movement: InventoryMovement | null;
}

export async function adjustInventory(payload: AdjustInventoryPayload): Promise<InventoryMutationResult> {
  const res = await apiClient.patch<ApiEnvelope<InventoryMutationResult>>("/admin/inventory/adjust", payload);
  return res.data.data;
}

export interface SetQuantityPayload {
  productId?: string;
  variantId?: string;
  quantity: number;
  note?: string;
}

export async function setInventoryQuantity(payload: SetQuantityPayload): Promise<InventoryMutationResult> {
  const res = await apiClient.post<ApiEnvelope<InventoryMutationResult>>("/admin/inventory/set-quantity", payload);
  return res.data.data;
}
