import apiClient, { type ApiEnvelope } from "./client";
import type { Category, CategoryStats, PexelsSearchResponse } from "../types";

export async function listCategories(): Promise<Category[]> {
  const res = await apiClient.get<ApiEnvelope<Category[]>>("/admin/categories");
  return res.data.data;
}

export async function getCategory(id: string): Promise<Category> {
  const res = await apiClient.get<ApiEnvelope<Category>>(`/admin/categories/${id}`);
  return res.data.data;
}

export async function getCategoryStats(id: string): Promise<CategoryStats> {
  const res = await apiClient.get<ApiEnvelope<CategoryStats>>(`/admin/categories/${id}/stats`);
  return res.data.data;
}

export interface CategoryPayload {
  nameAr: string;
  nameEn: string;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export async function createCategory(payload: CategoryPayload): Promise<Category> {
  const res = await apiClient.post<ApiEnvelope<Category>>("/admin/categories", payload);
  return res.data.data;
}

export async function updateCategory(id: string, payload: Partial<CategoryPayload>): Promise<Category> {
  const res = await apiClient.patch<ApiEnvelope<Category>>(`/admin/categories/${id}`, payload);
  return res.data.data;
}

export async function deleteCategory(id: string): Promise<{ message: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ message: string }>>(`/admin/categories/${id}`);
  return res.data.data;
}

export async function uploadCategoryImage(
  id: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<Category> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiClient.post<ApiEnvelope<Category>>(`/admin/categories/${id}/image`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (evt) => {
      if (!onProgress || !evt.total) return;
      onProgress(Math.round((evt.loaded / evt.total) * 100));
    },
  });
  return res.data.data;
}

export async function deleteCategoryImage(id: string): Promise<Category> {
  const res = await apiClient.delete<ApiEnvelope<Category>>(`/admin/categories/${id}/image`);
  return res.data.data;
}

export async function searchCategoryImages(params: {
  query: string;
  page?: number;
  perPage?: number;
}): Promise<PexelsSearchResponse> {
  const res = await apiClient.get<ApiEnvelope<PexelsSearchResponse>>("/admin/categories/pexels-search", {
    params,
  });
  return res.data.data;
}

export async function assignCategoryImageFromUrl(
  id: string,
  payload: {
    imageUrl: string;
    photographer?: string;
    photographerUrl?: string;
    sourceUrl?: string;
    sourceProvider?: string;
  },
): Promise<Category> {
  const res = await apiClient.post<ApiEnvelope<Category>>(`/admin/categories/${id}/image/from-url`, payload);
  return res.data.data;
}
