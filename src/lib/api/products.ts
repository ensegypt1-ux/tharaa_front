import apiClient, { type ApiEnvelope } from "./client";
import type { Meta, Product, ProductVariant } from "../types";

export interface ListProductsParams {
  page?: number;
  limit?: number;
  q?: string;
  categoryId?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  inStock?: boolean;
  missingImages?: boolean;
  lowStock?: boolean;
  sortBy?: "newest" | "name" | "price" | "stock";
  sortDir?: "asc" | "desc";
}

export interface ListProductsResult {
  data: Product[];
  meta: Meta;
}

export async function listProducts(params: ListProductsParams): Promise<ListProductsResult> {
  const res = await apiClient.get<ApiEnvelope<Product[]>>("/admin/products", { params });
  return { data: res.data.data, meta: (res.data.meta as unknown as Meta) ?? { page: 1, limit: 20, total: res.data.data.length, totalPages: 1 } };
}

export async function getProduct(id: string): Promise<Product> {
  const res = await apiClient.get<ApiEnvelope<Product>>(`/admin/products/${id}`);
  return res.data.data;
}

export interface ProductPayload {
  categoryId: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  sku?: string;
  unit: string;
  hasVariants?: boolean;
  regularPrice: number;
  salePrice?: number | null;
  isActive?: boolean;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  lowStockThreshold?: number;
  initialQuantity?: number;
}

export async function createProduct(payload: ProductPayload): Promise<Product> {
  const res = await apiClient.post<ApiEnvelope<Product>>("/admin/products", payload);
  return res.data.data;
}

export async function updateProduct(id: string, payload: Partial<ProductPayload>): Promise<Product> {
  const res = await apiClient.patch<ApiEnvelope<Product>>(`/admin/products/${id}`, payload);
  return res.data.data;
}

export async function deleteProduct(id: string): Promise<{ message: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ message: string }>>(`/admin/products/${id}`);
  return res.data.data;
}

export interface VariantPayload {
  nameAr: string;
  nameEn: string;
  sku?: string;
  price: number;
  salePrice?: number | null;
  isActive?: boolean;
  sortOrder?: number;
  initialQuantity?: number;
}

export async function createVariant(productId: string, payload: VariantPayload): Promise<ProductVariant> {
  const res = await apiClient.post<ApiEnvelope<ProductVariant>>(`/admin/products/${productId}/variants`, payload);
  return res.data.data;
}

export async function updateVariant(
  productId: string,
  variantId: string,
  payload: Partial<VariantPayload>,
): Promise<ProductVariant> {
  const res = await apiClient.patch<ApiEnvelope<ProductVariant>>(
    `/admin/products/${productId}/variants/${variantId}`,
    payload,
  );
  return res.data.data;
}

export async function deleteVariant(productId: string, variantId: string): Promise<{ message: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ message: string }>>(
    `/admin/products/${productId}/variants/${variantId}`,
  );
  return res.data.data;
}

export async function uploadProductImage(
  productId: string,
  file: File,
  isPrimary?: boolean,
): Promise<Product> {
  const formData = new FormData();
  formData.append("file", file);
  if (isPrimary) formData.append("isPrimary", "true");
  const res = await apiClient.post<ApiEnvelope<Product>>(`/admin/products/${productId}/images`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data;
}

export async function setPrimaryImage(productId: string, imageId: string): Promise<Product> {
  const res = await apiClient.patch<ApiEnvelope<Product>>(
    `/admin/products/${productId}/images/${imageId}/primary`,
  );
  return res.data.data;
}

export async function deleteProductImage(productId: string, imageId: string): Promise<{ message: string }> {
  const res = await apiClient.delete<ApiEnvelope<{ message: string }>>(
    `/admin/products/${productId}/images/${imageId}`,
  );
  return res.data.data;
}
