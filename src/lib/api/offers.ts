import apiClient, { type ApiEnvelope } from "./client";
import type { DiscountType, Offer, OfferScope } from "../types";

export async function listOffers(): Promise<Offer[]> {
  const res = await apiClient.get<ApiEnvelope<Offer[]>>("/admin/offers");
  return res.data.data;
}

export async function getOffer(id: string): Promise<Offer> {
  const res = await apiClient.get<ApiEnvelope<Offer>>(`/admin/offers/${id}`);
  return res.data.data;
}

export interface OfferPayload {
  titleAr: string;
  titleEn: string;
  scope: OfferScope;
  discountType: DiscountType;
  discountValue: number;
  categoryId?: string;
  productIds?: string[];
  startsAt: string;
  endsAt: string;
  isActive?: boolean;
}

export async function createOffer(payload: OfferPayload): Promise<Offer> {
  const res = await apiClient.post<ApiEnvelope<Offer>>("/admin/offers", payload);
  return res.data.data;
}

export async function updateOffer(id: string, payload: Partial<OfferPayload>): Promise<Offer> {
  const res = await apiClient.patch<ApiEnvelope<Offer>>(`/admin/offers/${id}`, payload);
  return res.data.data;
}

export async function deleteOffer(id: string): Promise<{ message: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ message: string }>>(`/admin/offers/${id}`);
  return res.data.data;
}

export async function uploadOfferImage(id: string, file: File): Promise<Offer> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiClient.post<ApiEnvelope<Offer>>(`/admin/offers/${id}/image`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data;
}
