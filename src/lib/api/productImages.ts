import apiClient, { type ApiEnvelope } from "./client";
import type { MissingImageProduct, Meta, PexelsSearchResponse, ProductImage } from "../types";

export interface ListMissingImagesParams {
  page?: number;
  limit?: number;
  categoryId?: string;
  q?: string;
  includeReviewed?: boolean;
}

export async function listMissingImages(
  params: ListMissingImagesParams,
): Promise<{ data: MissingImageProduct[]; meta: Meta }> {
  const res = await apiClient.get<ApiEnvelope<MissingImageProduct[]>>("/admin/product-images/missing", {
    params,
  });
  return { data: res.data.data, meta: res.data.meta as unknown as Meta };
}

export async function searchProductImages(params: {
  productId: string;
  query?: string;
  page?: number;
  perPage?: number;
}): Promise<PexelsSearchResponse> {
  // Prefer POST so custom queries stay out of the URL; GET remains supported by the backend.
  const res = await apiClient.post<ApiEnvelope<PexelsSearchResponse>>("/admin/product-images/search", params);
  return res.data.data;
}

export interface SelectImagePayload {
  productId: string;
  imageUrl: string;
  photographer?: string;
  photographerUrl?: string;
  sourceUrl?: string;
  sourceProvider?: string;
}

export async function selectProductImage(payload: SelectImagePayload): Promise<ProductImage> {
  const res = await apiClient.post<ApiEnvelope<ProductImage>>("/admin/product-images/select", payload);
  return res.data.data;
}

export async function markProductImageReviewed(productId: string): Promise<MissingImageProduct> {
  const res = await apiClient.patch<ApiEnvelope<MissingImageProduct>>(
    `/admin/product-images/${productId}/reviewed`,
  );
  return res.data.data;
}
