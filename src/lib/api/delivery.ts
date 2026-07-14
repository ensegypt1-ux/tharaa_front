import apiClient, { type ApiEnvelope } from "./client";
import type { DeliverySettings, PickupSettings } from "../types";

export async function getPublicSettings(): Promise<{
  delivery: DeliverySettings;
  pickup: PickupSettings;
  serviceCity: string;
}> {
  const res = await apiClient.get<
    ApiEnvelope<{ delivery: DeliverySettings; pickup: PickupSettings; serviceCity: string }>
  >("/settings/public");
  return res.data.data;
}

export async function updateDeliverySettings(
  payload: Partial<{
    isEnabled: boolean;
    fee: number;
    freeDeliveryThreshold: number | null;
    minOrderAmount: number;
    estimatedMinutesMin: number;
    estimatedMinutesMax: number;
    serviceCity: string;
  }>,
): Promise<DeliverySettings> {
  const res = await apiClient.patch<ApiEnvelope<DeliverySettings>>("/admin/delivery-settings", payload);
  return res.data.data;
}

export async function updatePickupSettings(
  payload: Partial<{
    isEnabled: boolean;
    minOrderAmount: number;
    estimatedMinutesMin: number;
    estimatedMinutesMax: number;
    storeNameAr: string;
    storeNameEn: string;
    addressAr: string;
    addressEn: string;
    latitude: number;
    longitude: number;
    workingHoursJson: Record<string, { open: string; close: string }>;
  }>,
): Promise<PickupSettings> {
  const res = await apiClient.patch<ApiEnvelope<PickupSettings>>("/admin/pickup-settings", payload);
  return res.data.data;
}
