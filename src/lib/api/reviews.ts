import apiClient, { type ApiEnvelope } from "./client";
import type {
  Meta,
  ProductReviewStats,
  Review,
  ReviewAdminStats,
  ReviewReport,
  ReviewReportStatus,
  ReviewSort,
  ReviewStatus,
} from "../types";

export interface ListReviewsResult {
  items: Review[];
  meta: Meta;
}

export interface ListReviewReportsResult {
  items: ReviewReport[];
  meta: Meta;
}

export interface ListReviewsParams {
  page?: number;
  limit?: number;
  status?: ReviewStatus;
  isVisible?: boolean;
  rating?: number;
  productId?: string;
  userId?: string;
  reported?: boolean;
  includeDeleted?: boolean;
  from?: string;
  to?: string;
  sort?: ReviewSort;
}

export async function listReviews(params: ListReviewsParams = {}): Promise<ListReviewsResult> {
  const res = await apiClient.get<ApiEnvelope<ListReviewsResult>>("/admin/reviews", { params });
  return res.data.data;
}

export async function getReviewAdminStats(): Promise<ReviewAdminStats> {
  const res = await apiClient.get<ApiEnvelope<ReviewAdminStats>>("/admin/reviews/stats");
  return res.data.data;
}

export async function approveReview(id: string): Promise<Review> {
  const res = await apiClient.patch<ApiEnvelope<Review>>(`/admin/reviews/${id}/approve`);
  return res.data.data;
}

export async function rejectReview(id: string): Promise<Review> {
  const res = await apiClient.patch<ApiEnvelope<Review>>(`/admin/reviews/${id}/reject`);
  return res.data.data;
}

export async function hideReview(id: string): Promise<Review> {
  const res = await apiClient.patch<ApiEnvelope<Review>>(`/admin/reviews/${id}/hide`);
  return res.data.data;
}

export async function showReview(id: string): Promise<Review> {
  const res = await apiClient.patch<ApiEnvelope<Review>>(`/admin/reviews/${id}/show`);
  return res.data.data;
}

export async function restoreReview(id: string): Promise<Review> {
  const res = await apiClient.patch<ApiEnvelope<Review>>(`/admin/reviews/${id}/restore`);
  return res.data.data;
}

export async function upsertReviewReply(id: string, text: string): Promise<Review> {
  const res = await apiClient.put<ApiEnvelope<Review>>(`/admin/reviews/${id}/reply`, { text });
  return res.data.data;
}

export async function deleteReviewReply(id: string): Promise<Review> {
  const res = await apiClient.delete<ApiEnvelope<Review>>(`/admin/reviews/${id}/reply`);
  return res.data.data;
}

export async function listReviewReports(params: {
  page?: number;
  limit?: number;
  status?: ReviewReportStatus;
  reviewId?: string;
}): Promise<ListReviewReportsResult> {
  const res = await apiClient.get<ApiEnvelope<ListReviewReportsResult>>("/admin/reviews/reports", {
    params,
  });
  return res.data.data;
}

export async function resolveReviewReport(
  reportId: string,
  payload: { status?: ReviewReportStatus; resolutionNote?: string },
): Promise<ReviewReport> {
  const res = await apiClient.patch<ApiEnvelope<ReviewReport>>(
    `/admin/reviews/reports/${reportId}/resolve`,
    payload,
  );
  return res.data.data;
}

export async function getProductReviewStats(productId: string): Promise<ProductReviewStats> {
  const res = await apiClient.get<ApiEnvelope<ProductReviewStats>>(
    `/products/${productId}/reviews/stats`,
  );
  return res.data.data;
}
